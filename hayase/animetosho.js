export default new class Animetosho {
  base = 'https://hayase-nyaa-proxy.vercel.app/api/animetosho/'

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
      query = query.replace(/[^\w\s-]/g, ' ').trim()
      query = query.replace(/\b(?:II|III|IV|VI|VII|VIII|IX|X)\b/gi, '').trim()

      const res = await fetch(this.base + encodeURIComponent(query))
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []

      return data.map(item => ({
        title: item.Name,
        link: item.Magnet,
        hash: item.hash || item.Magnet?.match(/btih:([A-Fa-f0-9]+)/)?.[1] || '',
        seeders: Number(item.Seeders || 0),
        leechers: Number(item.Leechers || 0),
        downloads: 0,
        size: item.SizeBytes || 0,
        date: item.DateUploaded ? new Date(item.DateUploaded) : new Date(),
        accuracy: 'medium',
        type: 'alt'
      })).filter(r => matchesEpisode(r.title, episode, title))
    } catch {
      return []
    }
  }

  async test() {
    try {
      const res = await fetch(this.base + 'one+piece')
      return res.ok
    } catch {
      return false
    }
  }
}()

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

  const resultSeasonMarkers = /[Ss](?:eason)?\s*0*[2-9](?:\b|[Ee])|[Ss](?:eason)?\s*1[0-9](?:\b|[Ee])|(?:2nd|3rd|\d+th)\s*[Ss]eason|\bI[I V]+\b(?![a-zA-Z])/
  const querySeasonMarkers = /[Ss](?:eason)?\s*0*[2-9](?:\b|[Ee])|[Ss](?:eason)?\s*1[0-9](?:\b|[Ee])|(?:2nd|3rd|\d+th)\s*[Ss]eason|\bI[I V]+\b(?![a-zA-Z])|\b[2-9]\s*$/
  const queryHasSeason = querySeasonMarkers.test(queryTitle || '')
  const resultHasSeason = resultSeasonMarkers.test(title)
  if (resultHasSeason && !queryHasSeason) return false

  return true
}
