export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const { source, query } = req.query
  if (!source || !query) {
    res.status(400).json({ error: 'Missing source or query' })
    return
  }

  const allowedSources = { nyaasi: 'nyaa.si', sukebei: 'sukebei.nyaa.si' }

  // Animetosho search
  if (source === 'animetosho') {
    const searchUrl = `https://animetosho.org/search/anime?q=${encodeURIComponent(query)}&submit`
    try {
      const html = await fetch(searchUrl)
      if (!html.ok) {
        res.status(html.status).json({ error: 'Animetosho fetch failed' })
        return
      }

      const body = await html.text()
      const entries = body.split('class="home_list_entry').slice(1)

      const results = entries.map(entry => {
        const extract = (pattern) => {
          const m = entry.match(pattern)
          return m ? m[1] : ''
        }

        const title = extract(/<div class="link"><a href="[^"]*">([^<]*)</a><\/div>/)
        const magnetRaw = extract(/<a href="(magnet:[^"]*?)" class="dllink">/) || extract(/href="(magnet:[^"]*?)">Magnet</a>/)
        const magnet = magnetRaw.replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
        const hashMatch = magnet.match(/btih:([A-Z2-7]+)/i)
        const hash = hashMatch ? hashMatch[1] : ''

        const sizeBytes = extract(/Total file size: ([\d,]+) bytes/)
        const sizeReadable = extract(/<div class="size"[^>]*>([^<]*)</)

        const dateRaw = extract(/Date\/time submitted: ([^"]*)/)
        const seeders = extract(/\[(\d+)↑/) || extract(/\[(\d+)&#8593;/)
        const leechers = extract(/\[(\d+)↓/) || extract(/\[(\d+)&#8595;/)

        const pageLink = extract(/<div class="link"><a href="([^"]*)"/)

        return {
          Name: title,
          Magnet: magnet,
          hash,
          Seeders: seeders || 0,
          Leechers: leechers || 0,
          Size: sizeReadable || '',
          SizeBytes: parseInt(sizeBytes.replace(/,/g, '')) || 0,
          DateUploaded: dateRaw || '',
          Page: pageLink
        }
      }).filter(r => r.Name && r.Magnet)

      res.json(results)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
    return
  }

  if (!allowedSources[source]) {
    res.status(400).json({ error: 'Invalid source. Use: nyaasi, sukebei, or animetosho' })
    return
  }

  const category = source === 'sukebei' ? 'c=1_3' : 'c=1_0'
  const rssUrl = `https://${allowedSources[source]}/?page=rss&${category}&q=${encodeURIComponent(query)}`

  try {
    const rss = await fetch(rssUrl)
    if (!rss.ok) {
      res.status(rss.status).json({ error: 'Nyaa fetch failed' })
      return
    }

    const xml = await rss.text()
    const items = xml.split('<item>').slice(1)
    const results = items.map(item => {
      const extract = (tag) => {
        const s = item.indexOf(`<${tag}>`)
        const e = item.indexOf(`</${tag}>`)
        return s >= 0 && e > s ? item.slice(s + tag.length + 2, e) : ''
      }

      const hash = extract('nyaa:infoHash')
      const title = extract('title').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '')
      const sizeStr = extract('nyaa:size')
      const size = parseSize(sizeStr)

      return {
        Name: title,
        Magnet: hash ? `magnet:?xt=urn:btih:${hash}` : '',
        Seeders: extract('nyaa:seeders'),
        Leechers: extract('nyaa:leechers'),
        Downloads: extract('nyaa:downloads'),
        Size: sizeStr,
        SizeBytes: size,
        DateUploaded: extract('pubDate')
      }
    })

    res.json(results)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

function parseSize(sizeStr) {
  if (!sizeStr) return 0
  const match = sizeStr.match(/([\d.]+)\s*(KiB|MiB|GiB|TiB|KB|MB|GB|TB)/i)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  const multipliers = { KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KIB: 1024, MIB: 1048576, GIB: 1073741824, TIB: 1099511627776 }
  return value * (multipliers[unit] || 0)
}
