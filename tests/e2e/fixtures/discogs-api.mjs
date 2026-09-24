import http from "node:http"

const port = getPort()

const searchResult = {
  id: 1001,
  title: "Miles Davis - Nefertiti",
  artist: "Miles Davis, Tony Williams",
  thumb: "",
  country: "US",
  year: "1968",
  format: ["Album", "LP"],
  label: ["Columbia"],
  type: "release",
  genre: ["Jazz"],
  style: ["Post Bop"],
  catno: "CS 9594",
}

const release = {
  id: 1001,
  title: "Miles Davis - Nefertiti",
  year: 1968,
  master_id: 42,
  artists_sort: "Miles Davis",
  artists: [{ name: "Miles Davis" }],
  uri: "https://www.discogs.com/release/1001",
  tracklist: [
    { position: "A1", type_: "track", title: "Nefertiti" },
    { position: "A2", type_: "track", title: "Fall" },
    { position: "B1", type_: "track", title: "Pinocchio" },
  ],
  extraartists: [
    { name: "Tony Williams", role: "Drums", tracks: "A1 to A2" },
    { name: "Herbie Hancock", role: "Piano", tracks: "A1" },
    { name: "Miles Davis", role: "Trumpet", tracks: "A1" },
    { name: "Teo Macero", role: "Producer" },
  ],
  videos: [
    {
      uri: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Miles Davis - Nefertiti (Official Audio)",
      duration: 472,
      embed: true,
    },
    {
      uri: "https://vimeo.com/123456",
      title: "Nefertiti live footage",
      duration: 95,
      embed: true,
    },
  ],
}

const master = {
  id: 42,
  title: "Nefertiti",
  year: 1968,
  main_release: 1001,
  artists: [{ name: "Miles Davis" }],
  tracklist: release.tracklist,
}

const japanReissue = {
  ...release,
  id: 1002,
  year: 1986,
  country: "Japan",
  uri: "https://www.discogs.com/release/1002",
  extraartists: [
    { name: "Ron Carter", role: "Bass", tracks: "A1 to B1" },
    { name: "Miles Davis", role: "Trumpet", tracks: "A1" },
  ],
  videos: [],
}

const masterVersions = {
  pagination: { page: 1, pages: 1, items: 3, per_page: 100 },
  versions: [
    {
      id: 1001,
      title: "Nefertiti",
      format: "Vinyl, LP, Album, Stereo",
      label: "Columbia",
      catno: "CS 9594",
      country: "US",
      released: "1968",
      major_formats: ["Vinyl"],
    },
    {
      id: 1003,
      title: "Nefertiti",
      format: "Vinyl, LP, Album",
      label: "CBS",
      catno: "S 63248",
      country: "UK",
      released: "1968",
      major_formats: ["Vinyl"],
    },
    {
      id: 1002,
      title: "Nefertiti",
      format: "CD, Album, Reissue",
      label: "CBS/Sony",
      catno: "32DP 717",
      country: "Japan",
      released: "1986-06-01",
      major_formats: ["CD"],
    },
  ],
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`)

  if (url.pathname === "/health") {
    return sendJson(response, { ok: true })
  }

  if (url.pathname === "/database/search") {
    if (isSlowSearch(url.searchParams)) {
      await delay(900)
    }

    if (isLargeSearch(url.searchParams)) {
      return sendJson(response, buildLargeSearchResponse(url.searchParams))
    }

    if (isFilterSearch(url.searchParams)) {
      return sendJson(response, buildFilterSearchResponse(url.searchParams))
    }

    return sendJson(response, {
      pagination: { page: 1, pages: 1, items: isEmptySearch(url.searchParams) ? 0 : 1, per_page: 100 },
      results: isEmptySearch(url.searchParams) ? [] : [searchResult],
    })
  }

  if (url.pathname === "/releases/1001") {
    return sendJson(response, release)
  }

  if (url.pathname === "/releases/1002") {
    return sendJson(response, japanReissue)
  }

  if (url.pathname === "/masters/42") {
    return sendJson(response, master)
  }

  if (url.pathname === "/masters/42/versions") {
    return sendJson(response, masterVersions)
  }

  const releaseMatch = url.pathname.match(/^\/releases\/(\d+)$/)
  if (releaseMatch) {
    return sendJson(response, buildRelease(Number(releaseMatch[1])))
  }

  sendJson(response, { message: "Not found" }, 404)
})

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock Discogs API listening on http://127.0.0.1:${port}`)
})

process.on("SIGTERM", closeServer)
process.on("SIGINT", closeServer)

function sendJson(response, body, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json" })
  response.end(JSON.stringify(body))
}

function isEmptySearch(searchParams) {
  return getSearchText(searchParams).includes("no match")
}

function isSlowSearch(searchParams) {
  return getSearchText(searchParams).includes("slow search")
}

function isLargeSearch(searchParams) {
  return getSearchText(searchParams).includes("large search")
}

function isFilterSearch(searchParams) {
  return getSearchText(searchParams).includes("filter search")
}

function getSearchText(searchParams) {
  return ["credit", "track", "q", "genre"]
    .map((key) => searchParams.get(key) || "")
    .join(" ")
    .toLowerCase()
}

function buildLargeSearchResponse(searchParams) {
  const page = getPage(searchParams)
  const totalItems = 205
  const pages = 3
  const start = (page - 1) * 100 + 1
  const size = page === pages ? 5 : 100

  return {
    pagination: { page, pages, items: totalItems, per_page: 100 },
    results: Array.from({ length: size }, (_, index) => {
      const number = start + index
      return {
        id: 2000 + number - 1,
        title: `Large Search Album ${number}`,
        artist: "Large Search Ensemble",
        thumb: "",
        country: "US",
        year: String(1950 + (number % 70)),
        format: ["Album", "LP"],
        label: ["Mock"],
        type: "release",
        genre: ["Jazz"],
        style: ["Post Bop"],
        catno: `MOCK-${number}`,
      }
    }),
  }
}

function buildFilterSearchResponse(searchParams) {
  const results = [
    {
      id: 3001,
      title: "1971 Filter Search Album",
      artist: "Filter Search Ensemble",
      thumb: "",
      country: "US",
      year: "1971",
      format: ["Album", "LP"],
      label: ["Mock"],
      type: "release",
      genre: ["Jazz"],
      style: ["Fusion"],
      catno: "FILTER-1971",
    },
    {
      id: 3002,
      title: "1984 Filter Search Album",
      artist: "Filter Search Ensemble",
      thumb: "",
      country: "US",
      year: "1984",
      format: ["Album", "CD"],
      label: ["Mock"],
      type: "release",
      genre: ["Jazz"],
      style: ["Fusion"],
      catno: "FILTER-1984",
    },
    {
      id: 3003,
      title: "1964 Filter Search Album",
      artist: "Filter Search Ensemble",
      thumb: "",
      country: "Japan",
      year: "1964",
      format: ["Album", "LP"],
      label: ["Mock"],
      type: "release",
      genre: ["Jazz"],
      style: ["Post Bop"],
      catno: "FILTER-1964",
    },
  ].filter((result) => {
    const year = searchParams.get("year")
    const country = searchParams.get("country")
    const format = searchParams.get("format")

    if (year && result.year !== year) return false
    if (country && result.country.toLowerCase() !== country.toLowerCase()) {
      return false
    }
    if (
      format &&
      !result.format.some(
        (item) => item.toLowerCase() === format.toLowerCase()
      )
    ) {
      return false
    }

    return true
  })

  return {
    pagination: { page: 1, pages: 1, items: results.length, per_page: 100 },
    results,
  }
}

function buildRelease(id) {
  const number = id >= 2000 && id < 3000 ? id - 1999 : id
  const title =
    id >= 2000 && id < 3000
      ? `Large Search Album ${number}`
      : id === 3001
        ? "1971 Filter Search Album"
        : id === 3002
          ? "1984 Filter Search Album"
          : "1964 Filter Search Album"

  return {
    id,
    title,
    year: Number(title.slice(0, 4)) || 1971,
    artists_sort: "Mock Artist",
    artists: [{ name: "Mock Artist" }],
    uri: `https://www.discogs.com/release/${id}`,
    tracklist: [{ position: "A1", type_: "track", title }],
    extraartists: [{ name: "Tony Williams", role: "Drums", tracks: "A1" }],
    videos: [],
  }
}

function getPage(searchParams) {
  const value = Number(searchParams.get("page") || 1)
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function closeServer() {
  server.close(() => process.exit(0))
}

function getPort() {
  const portIndex = process.argv.indexOf("--port")
  const value = portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT
  return Number(value || 39201)
}
