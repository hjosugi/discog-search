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
    { name: "Teo Macero", role: "Producer" },
  ],
  videos: [],
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`)

  if (url.pathname === "/health") {
    return sendJson(response, { ok: true })
  }

  if (url.pathname === "/database/search") {
    return sendJson(response, {
      pagination: { page: 1, pages: 1 },
      results: [searchResult],
    })
  }

  if (url.pathname === "/releases/1001") {
    return sendJson(response, release)
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

function closeServer() {
  server.close(() => process.exit(0))
}

function getPort() {
  const portIndex = process.argv.indexOf("--port")
  const value = portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT
  return Number(value || 39201)
}
