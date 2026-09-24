import { afterEach, describe, expect, it, vi } from "vitest"

import { createDiscogsApi } from "./api"
import { createDiscogsClient, createMemoryCache } from "./client"
import {
  DiscogsFetchError,
  DiscogsRateLimitError,
  DiscogsResponseError,
} from "./errors"

const env = {
  DISCOGS_API_BASE_URL: "https://discogs.test",
  DISCOGS_TOKEN: "test-token",
}

describe("Discogs client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("serves repeated requests from the response cache", async () => {
    const fetchMock = stubFetch(() => Response.json({ id: 1, title: "Cached" }))
    const client = createDiscogsClient(env, createMemoryCache())

    await client.request("masters/1")
    await client.request("masters/1")

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("throws DiscogsRateLimitError on 429 and during the cooldown", async () => {
    const fetchMock = stubFetch(
      () =>
        new Response("slow down", {
          status: 429,
          headers: { "Retry-After": "60" },
        })
    )
    const client = createDiscogsClient(env, createMemoryCache())

    const first = (await client
      .request("masters/1")
      .catch((error: unknown) => error)) as DiscogsRateLimitError
    expect(first).toBeInstanceOf(DiscogsRateLimitError)
    expect(first.status).toBe(429)
    expect(first.retryAt).toBeGreaterThan(Date.now() + 50_000)

    await expect(client.request("masters/2")).rejects.toBeInstanceOf(
      DiscogsRateLimitError
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("throws DiscogsFetchError for other HTTP failures", async () => {
    stubFetch(() => Response.json({ message: "nope" }, { status: 404 }))
    const client = createDiscogsClient(env, createMemoryCache())

    const error = (await client
      .request("masters/404")
      .catch((value: unknown) => value)) as DiscogsFetchError

    expect(error).toBeInstanceOf(DiscogsFetchError)
    expect(error).not.toBeInstanceOf(DiscogsRateLimitError)
    expect(error.status).toBe(404)
  })
})

describe("Discogs API schemas", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns validated payloads and treats null fields as missing", async () => {
    stubFetch(() =>
      Response.json({
        id: 7,
        title: "Speak No Evil",
        year: null,
        tracklist: [
          { position: "A1", type_: "track", title: "Witch Hunt", duration: null },
        ],
        extraartists: [{ name: "Elvin Jones", role: "Drums", tracks: null }],
      })
    )
    const api = createDiscogsApi(createDiscogsClient(env, createMemoryCache()))

    const release = await api.getRelease(7)

    expect(release.title).toBe("Speak No Evil")
    expect(release.year).toBeUndefined()
    expect(release.tracklist?.[0]).not.toHaveProperty("duration")
    expect(release.extraartists?.[0]).toEqual({ name: "Elvin Jones", role: "Drums" })
  })

  it("rejects payloads that do not match the schema", async () => {
    stubFetch(() => Response.json({ id: "not-a-number", title: 42 }))
    const api = createDiscogsApi(createDiscogsClient(env, createMemoryCache()))

    const error = await api.getMaster(9).catch((value) => value)

    expect(error).toBeInstanceOf(DiscogsResponseError)
    expect(error.status).toBe(502)
    expect(error.message).toContain("masters/9")
  })

  it("validates database search responses", async () => {
    stubFetch(() =>
      Response.json({
        pagination: { page: 1, pages: 1, items: 1, per_page: 5 },
        results: [{ id: 1, title: "Artist - Title", year: "1966", thumb: "" }],
      })
    )
    const api = createDiscogsApi(createDiscogsClient(env, createMemoryCache()))

    const response = await api.search({ type: "release", per_page: 5, page: 1 })

    expect(response.results).toEqual([
      { id: 1, title: "Artist - Title", year: "1966", thumb: "" },
    ])
  })
})

function stubFetch(handler: (url: URL) => Response) {
  const fetchMock = vi.fn(async (input: string | URL | Request) =>
    handler(new URL(input instanceof Request ? input.url : input.toString()))
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}
