export default new class Nyaa {
  base = 'https://hayase-nyaa-proxy.vercel.app/api/nyaasi/'

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
        hash: item.Magnet?.match(/btih:([A-Fa-f0-9]+)/)?.[1] || '',
        seeders: Number(item.Seeders || 0),
        leechers: Number(item.Leechers || 0),
        downloads: Number(item.Downloads || 0),
        size: item.SizeBytes || 0,
        date: new Date(item.DateUploaded),
        accuracy: 'medium',
        type: 'alt'
      }))
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
