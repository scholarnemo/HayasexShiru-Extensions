export default new class Nyaa {
  base = 'https://nyaa.si/?page=rss&c=1_0&q='

  async single({ titles, episode }) {
    if (!titles?.length) return []
    return this.search(titles[0], episode)
  }

  batch = this.single
  movie = this.single

  async search(title, episode) {
    let query = title.replace(/[^\w\s-]/g, ' ').trim()
    if (episode) query += ` ${episode.toString().padStart(2, '0')}`

    const res = await fetch(this.base + encodeURIComponent(query))
    const text = await res.text()
    if (!text) return []

    return this.parseRss(text)
  }

  parseRss(xml) {
    const items = xml.split('<item>').slice(1)
    return items.map(item => {
      const extract = (tag) => {
        const s = item.indexOf(`<${tag}>`)
        const e = item.indexOf(`</${tag}>`)
        return s >= 0 && e > s ? item.slice(s + tag.length + 2, e) : ''
      }

      const hash = extract('nyaa:infoHash')
      const magnet = hash ? `magnet:?xt=urn:btih:${hash}` : ''
      const sizeStr = extract('nyaa:size')
      const size = this.parseSize(sizeStr)

      return {
        title: extract('title').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ''),
        link: magnet,
        hash,
        seeders: Number(extract('nyaa:seeders') || 0),
        leechers: Number(extract('nyaa:leechers') || 0),
        downloads: Number(extract('nyaa:downloads') || 0),
        size,
        date: new Date(extract('pubDate')),
        accuracy: 'medium',
        type: 'alt'
      }
    })
  }

  parseSize(sizeStr) {
    if (!sizeStr) return 0
    const match = sizeStr.match(/([\d.]+)\s*(KiB|MiB|GiB|TiB|KB|MB|GB|TB)/i)
    if (!match) return 0
    const value = parseFloat(match[1])
    const unit = match[2].toUpperCase()
    const multipliers = { KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KIB: 1024, MIB: 1048576, GIB: 1073741824, TIB: 1099511627776 }
    return value * (multipliers[unit] || 0)
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
