export default new class Animetosho {
  base = 'https://hayase-nyaa-proxy-p3fdsi4as-seirios-projects.vercel.app/api/animetosho/'

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
      if (words.length > 3) query = words.slice(0, 3).join(' ')

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
      })).filter(r => matchesEpisode(r.title, episode))
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

function matchesEpisode(title, ep) {
  if (!ep) return true
  const p = String(ep).padStart(2, '0')
  return new RegExp(
    '[Ee][Pp]?\\.?\\s*' + p + '\\b|' +
    '[Ee]\\s*' + ep + '\\b|' +
    '(?:^|[-\\s])' + p + '(?=[-\\s\\[\\]])|' +
    '(?:^|[-\\s])' + ep + '(?=[-\\s\\[\\]])'
  ).test(title)
}
