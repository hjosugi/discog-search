import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createCacheApiStore,
  createDiscogsCache,
  createKvCacheStore,
  createLayeredCacheStore,
  createMemoryCacheStore,
  type CacheLike,
  type KvNamespaceLike,
} from "./cache"
import { createDiscogsClient } from "./client"
import { DiscogsRateLimitError } from "./errors"

const env = {
  DISCOGS_API_BASE_URL: "https://discogs.test",
  DISCOGS_TOKEN: "test-token",
}

function fakeKv() {
  const values = new Map<string, string>()
  const puts: Array<{ key: string; expirationTtl?: number }> = []
  const kv: KvNamespaceLike = {
    async get(key) {
      const value = values.get(key)
      return value === undefined ? null : JSON.parse(value)
    },
    async put(key, value, options) {
      values.set(key, value)
      puts.push({ key, expirationTtl: options?.expirationTtl })
    },
  }
  return { kv, values, puts }
}

function fakeCacheApi() {
  const entries = new Map<string, Response>()
  const cache: CacheLike = {
    async match(request) {
      return entries.get(request.url)?.clone()
    },
    async put(request, response) {
      entries.set(request.url, response.clone())
    },
  }
  return { cache, entries }
}

/** A fresh client per call simulates a new Workers isolate. */
function isolateClient(shared: ReturnType<typeof createKvCacheStore>) {
  return createDiscogsClient(env, {
    cache: createLayeredCacheStore(createMemoryCacheStore(), shared),
    pending: new Map(),
  })
}

describe("cache stores", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("expires memory entries after their TTL", async () => {
    vi.useFakeTimers()
    const store = createMemoryCacheStore()
    await store.putResponse("a", { ok: true }, 1000)

    expect(await store.getResponse("a")).toEqual({ ok: true })
    vi.advanceTimersByTime(1001)
    expect(await store.getResponse("a")).toBeUndefined()
  })

  it("stores KV entries under hashed keys with a KV-compatible TTL", async () => {
    const { kv, values, puts } = fakeKv()
    const store = createKvCacheStore(kv)
    const longKey = `https://api.discogs.com/database/search?q=${"x".repeat(600)}`

    await store.putResponse(longKey, { id: 1 }, 10_000)

    expect(await store.getResponse(longKey)).toEqual({ id: 1 })
    const [key] = [...values.keys()]
    expect(key).toMatch(/^discogs:v1:[0-9a-f]{64}$/)
    expect(puts[0].expirationTtl).toBe(60)
  })

  it("round-trips the rate limit through KV and the Cache API", async () => {
    const until = Date.now() + 45_000
    const kvStore = createKvCacheStore(fakeKv().kv)
    const cacheStore = createCacheApiStore(fakeCacheApi().cache)

    await kvStore.setRateLimitedUntil(until)
    await cacheStore.setRateLimitedUntil(until)

    expect(await kvStore.getRateLimitedUntil()).toBe(until)
    expect(await cacheStore.getRateLimitedUntil()).toBe(until)
    expect(await createMemoryCacheStore().getRateLimitedUntil()).toBe(0)
  })

  it("caches Cache API responses with max-age and ignores expired entries", async () => {
    vi.useFakeTimers()
    const { cache, entries } = fakeCacheApi()
    const store = createCacheApiStore(cache)

    await store.putResponse("https://api.discogs.com/masters/1", { id: 1 }, 600_000)

    const [[url, response]] = [...entries.entries()]
    expect(url).toBe(
      "https://discogs-cache.internal/response?key=https%3A%2F%2Fapi.discogs.com%2Fmasters%2F1"
    )
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=600")
    expect(await store.getResponse("https://api.discogs.com/masters/1")).toEqual({ id: 1 })

    vi.advanceTimersByTime(600_001)
    expect(await store.getResponse("https://api.discogs.com/masters/1")).toBeUndefined()
  })

  it("treats a failing shared layer as a cache miss", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const broken = createKvCacheStore({
      get: async () => {
        throw new Error("KV down")
      },
      put: async () => {
        throw new Error("KV down")
      },
    })
    const store = createLayeredCacheStore(createMemoryCacheStore(), broken)

    await store.putResponse("a", 1, 1000)
    expect(await store.getResponse("a")).toBe(1)
    expect(await store.getResponse("b")).toBeUndefined()
    expect(await store.getRateLimitedUntil()).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe("createDiscogsCache", () => {
  it("prefers a KV binding, then the Cache API, then memory", async () => {
    const memory = createMemoryCacheStore()
    const { kv, values } = fakeKv()
    const { cache, entries } = fakeCacheApi()

    await createDiscogsCache({ DISCOGS_CACHE: kv }, { memory, cacheStorage: cache })
      .putResponse("k", 1, 1000)
    expect(values.size).toBe(1)
    expect(entries.size).toBe(0)

    await createDiscogsCache({}, { memory, cacheStorage: cache }).putResponse("k", 1, 1000)
    expect(entries.size).toBe(1)

    expect(createDiscogsCache({}, { memory, cacheStorage: null })).toBe(memory)
  })
})

describe("Discogs client across isolates", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("serves a repeated request from the shared cache in another isolate", async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: 1, title: "Shared" }))
    vi.stubGlobal("fetch", fetchMock)
    const shared = createKvCacheStore(fakeKv().kv)

    await isolateClient(shared).request("masters/1")
    const second = await isolateClient(shared).request("masters/1")

    expect(second).toEqual({ id: 1, title: "Shared" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("shares the 429 cooldown with other isolates", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("slow down", { status: 429, headers: { "Retry-After": "30" } })
    )
    vi.stubGlobal("fetch", fetchMock)
    const shared = createCacheApiStore(fakeCacheApi().cache)

    await expect(isolateClient(shared).request("masters/1")).rejects.toBeInstanceOf(
      DiscogsRateLimitError
    )
    await expect(isolateClient(shared).request("masters/2")).rejects.toBeInstanceOf(
      DiscogsRateLimitError
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("still serves cached data while the cooldown is active", async () => {
    const shared = createKvCacheStore(fakeKv().kv)
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: 1 })))
    await isolateClient(shared).request("masters/1")
    await shared.setRateLimitedUntil(Date.now() + 30_000)

    await expect(isolateClient(shared).request("masters/1")).resolves.toEqual({ id: 1 })
  })
})
