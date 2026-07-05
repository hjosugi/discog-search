import { afterEach, describe, expect, it, vi } from "vitest"

import { createServerApp } from "./app"

const env = {
  DISCOGS_API_BASE_URL: "https://discogs.test",
  DISCOGS_TOKEN: "test-token",
}

describe("Elysia API", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("validates search query params", async () => {
    stubDiscogsFetch()
    const app = createServerApp({ env })

    const response = await app.handle(
      new Request("https://app.test/api/search?page=not-a-number")
    )

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request parameters.",
    })
  })

  it("serves ranked search results from Discogs", async () => {
    const fetchMock = stubDiscogsFetch()
    const app = createServerApp({ env })

    const response = await app.handle(
      new Request("https://app.test/api/search?credit=Tony%20Williams")
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      results: [{ id: 1001, title: "Miles Davis - Nefertiti" }],
      pagination: {
        page: 1,
        totalPages: 1,
        totalItems: 1,
        reachedPageLimit: false,
      },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://discogs.test/database/search?"),
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    )
    expect(
      (fetchMock.mock.calls[0]?.[1]?.headers as Headers).get("Authorization")
    ).toBe("Discogs token=test-token")
  })

  it("serves track suggestions", async () => {
    stubDiscogsFetch()
    const app = createServerApp({ env })

    const response = await app.handle(
      new Request("https://app.test/api/suggestions?song=Nef")
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      suggestions: [expect.objectContaining({ id: 1001 })],
    })
  })

  it("resolves master detail data through its main release", async () => {
    stubDiscogsFetch()
    const app = createServerApp({ env })

    const response = await app.handle(
      new Request("https://app.test/api/releases/42?song=Nefertiti")
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      detailId: "42",
      detailKind: "master",
      selectedTrackPosition: "A1",
      master: { id: 42, main_release: 1001 },
      release: { id: 1001, title: "Miles Davis - Nefertiti" },
    })
  })
})

function stubDiscogsFetch() {
  const fetchMock = vi.fn(
    async (...args: [input: string | URL | Request, init?: RequestInit]) => {
      const [input] = args
      const url = toUrl(input)

      if (url.pathname === "/database/search") {
        return Response.json({
          pagination: { page: 1, pages: 1, items: 1, per_page: 100 },
          results: [searchResult],
        })
      }

      if (url.pathname === "/masters/42") {
        return Response.json(master)
      }

      if (url.pathname === "/releases/1001") {
        return Response.json(release)
      }

      return Response.json({ message: "Not found" }, { status: 404 })
    }
  )

  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function toUrl(input: string | URL | Request) {
  if (input instanceof Request) return new URL(input.url)
  return new URL(input.toString())
}

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

const master = {
  id: 42,
  title: "Miles Davis - Nefertiti",
  year: 1968,
  artists: [{ name: "Miles Davis" }],
  main_release: 1001,
  tracklist: [{ position: "A1", type_: "track", title: "Nefertiti" }],
}

const release = {
  id: 1001,
  title: "Miles Davis - Nefertiti",
  year: 1968,
  artists_sort: "Miles Davis",
  artists: [{ name: "Miles Davis" }],
  master_id: 42,
  tracklist: [
    {
      position: "A1",
      type_: "track",
      title: "Nefertiti",
      extraartists: [{ name: "Tony Williams", role: "Drums" }],
    },
  ],
  extraartists: [{ name: "Tony Williams", role: "Drums", tracks: "A1" }],
  videos: [],
}
