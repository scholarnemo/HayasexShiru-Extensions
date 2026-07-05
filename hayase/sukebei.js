export default new class Sukebei {
  base = 'https://hayase-nyaa-proxy.vercel.app/api/sukebei/'

  async single({ titles, episode }) {
    if (!titles?.length) return []
    return this.search(titles[0], episode)
  }

  batch = this.single
  movie = this.single

  async search(title, episode) {
    try {
      let query = title.replace(/[^\w\s-]/g, ' ').trim()
      let words = query.split(/\s+/).filter(Boolean)
      if (words.length > 5) query = words.slice(0, 5).join(' ')

      const res = await fetch(this.base + encodeURIComponent(query))
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []

      return data.map(item => ({
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
      })).filter(r => matchesEpisode(r.title, episode, title))
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

  const seasonMarkers = /[Ss](?:eason)?\s*0*[2-9](?:\b|[Ee])|[Ss](?:eason)?\s*1[0-9](?:\b|[Ee])|(?:2nd|3rd|\d+th)\s*[Ss]eason|\bI[I V]+\b(?![a-zA-Z])/
  const queryHasSeason = seasonMarkers.test(queryTitle || '')
  const resultHasSeason = seasonMarkers.test(title)
  if (resultHasSeason && !queryHasSeason) return false

  return true
}
