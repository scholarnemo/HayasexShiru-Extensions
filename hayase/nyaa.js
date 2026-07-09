export default new class Nyaa {
  base = "https://hayase-nyaa-proxy.vercel.app/api/nyaasi/"

  async single({ titles, episode }) {
    if (!titles || !titles.length) return []
    return this.search(titles[0], episode)
  }

  batch = this.single
  movie = this.single

  async search(title, episode) {
    try {
      let query = title.split(/[,:;]\s*/)[0].trim()
      query = query.replace(/[^\w\s-]/g, " ").trim()
      query = query.replace(/\b(?:II|III|IV|VI|VII|VIII|IX|X)\b/gi, "").trim()
      var words = query.split(/\s+/).filter(Boolean)
      if (words.length > 3) query = words.slice(0, 3).join(" ")

      var res = await fetch(this.base + encodeURIComponent(query))
      if (!res.ok) return []
      var data = await res.json()
      if (!Array.isArray(data)) return []

      return data.map(function(item) {
        return {
          title: item.Name,
          link: item.Magnet,
          hash: item.Magnet ? (item.Magnet.match(/btih:([A-Fa-f0-9]+)/) || ["",""])[1] : "",
          seeders: Number(item.Seeders || 0),
          leechers: Number(item.Leechers || 0),
          downloads: Number(item.Downloads || 0),
          size: item.SizeBytes || 0,
          date: new Date(item.DateUploaded),
          accuracy: "medium",
          type: "alt"
        }
      }).filter(function(r) { return matchesEpisode(r.title, episode, title) })
    } catch (e) {
      return []
    }
  }

  async test() {
    try {
      var res = await fetch(this.base + "one+piece")
      return res.ok
    } catch (e) {
      return false
    }
  }
}

function padString(ep) {
  if (String(ep).length >= 2) return String(ep)
  return "0" + String(ep)
}

function matchesEpisode(name, ep, queryTitle) {
  if (!ep) return true
  var p = padString(ep)
  var patterns = [
    "[Ee][Pp]?\\.?\\s*" + p + "\\b",
    "[Ee]\\s*" + ep + "\\b",
    "(?:^|[-\\s\\(])" + p + "(?=[-\\s\\[\\]\\)]|$)",
    "(?:^|[-\\s\\(])" + ep + "(?=[-\\s\\[\\]\\)]|$)"
  ]
  var hasEpisode = new RegExp(patterns.join("|")).test(name)
  if (!hasEpisode) return false

  var seasonRegex = /[Ss](?:eason)?\s*0*[2-9](?:\b|[Ee])|[Ss](?:eason)?\s*1[0-9](?:\b|[Ee])|(?:2nd|3rd|\d+th)\s*[Ss]eason|\bI[I V]+\b(?![a-zA-Z])/
  var queryHasSeason = seasonRegex.test(queryTitle || "")
  var resultHasSeason = seasonRegex.test(name)
  if (resultHasSeason && !queryHasSeason) return false

  return true
}
