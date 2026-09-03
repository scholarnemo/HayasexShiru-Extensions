export default new class Sukebei {
  base = 'https://hayase-nyaa-proxy.vercel.app/api/sukebei/'

  async single({ titles, episode }) {
    if (!titles || !titles.length) return []
    const title = titles
      .filter(t => typeof t === 'string' && t.trim() && /^[\x20-\x7E]+$/.test(t))
      .sort((a, b) => b.length - a.length)[0] || titles[0]
    return this.search(title, episode)
  }

  batch = this.single
  movie = this.single

  async search(title, episode) {
    try {
      let query = title.split(/[,:;]\s*/, 2).map(p => p.trim()).join(' ')
      query = query.replace(/[^\w\s]/g, ' ').trim()
      query = query.replace(/\b\d+(?:st|nd|rd|th)\s+[Ss]eason\b|\b[Ss]eason\s*\d+\b/g, ' ').trim()
      query = query.replace(/\b(I{1,3}|IV|V|VI{0,3}|IX|X)\b|\b[Ss][0-9]+\b/g, ' ').trim()
      query = query.replace(/\s+/g, ' ').trim()

      const res = await fetch(this.base + encodeURIComponent(query))
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []

      const mapped = data.map(item => ({
        title: item.Name,
        link: item.Magnet,
        hash: item.Magnet?.match(/btih:([A-Fa-f0-9]+)/)?.[1] || '',
        seeders: Number(item.Seeders || 0),
        leechers: Number(item.Leechers || 0),
        downloads: Number(item.Downloads || 0),
        size: item.SizeBytes || 0,
        date: new Date(item.DateUploaded),
        accuracy: 'medium',
        type: 'alt'
      }))
      const seasonOk = mapped.filter(r => !wrongSeason(r.title, title))
      const pool = (seasonOk.length > 0 ? seasonOk : mapped).slice().sort((a, b) => b.seeders - a.seeders)
      return pool
    } catch {
      return []
    }
  }

  async test() {
    try {
      const res = await fetch(this.base + 'test')
      return res.ok
    } catch {
      return false
    }
  }
}()

function wrongSeason(title, queryTitle) {
  const markers = /[Ss](?:eason)?\s*0*[2-9](?:\b|[Ee])|[Ss](?:eason)?\s*1[0-9](?:\b|[Ee])|(?:2nd|3rd|\d+th)\s*[Ss]eason|\bI[I V]+\b(?![a-zA-Z])/
  const resultHas = markers.test(title)
  const queryHas = markers.test(queryTitle || '') || /\b[2-9]\s*$/.test(queryTitle || '')
  return resultHas && !queryHas
}

function matchesEpisode(title, ep, queryTitle) {
  if (!ep) return true
  const p = String(ep).padStart(2, '0')
  const hasEpisode = new RegExp(
    '[Ee][Pp]?\\.?\\s*' + p + '\\b|' +
    '[Ee]\\s*' + ep + '\\b|' +
    '(?:^|[-\\s\\(])' + p + '(?=[-\\s\\[\\]\\)]|$)|' +
    '(?:^|[-\\s\\(])' + ep + '(?=[-\\s\\[\\]\\)]|$)'
  ).test(title)
  if (!hasEpisode) return false
  if (wrongSeason(title, queryTitle)) return false
  return true
}
