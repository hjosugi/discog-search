/**
 * Cache backends for Discogs responses and the shared 429 cooldown.
 *
 * Cloudflare Workers run many short-lived isolates, so module memory alone is
 * neither shared nor durable. `createDiscogsCache()` therefore layers a small
 * per-isolate memory cache over a shared store:
 *
 * 1. a Workers KV namespace bound as `DISCOGS_CACHE` (global, optional), else
 * 2. the Workers Cache API (`caches.default`, shared per data center, needs no
 *    binding), else
 * 3. memory only (Node tests, plain Vite dev).
 */

export type DiscogsCacheStore = {
  /** Returns the cached JSON value, or undefined when missing or expired. */
  getResponse(key: string): Promise<unknown>
  putResponse(key: string, value: unknown, ttlMs: number): Promise<void>
  /** Epoch milliseconds until which Discogs must not be called (0 if none). */
  getRateLimitedUntil(): Promise<number>
  setRateLimitedUntil(until: number): Promise<void>
}

/** The subset of `KVNamespace` the cache uses. */
export type KvNamespaceLike = {
  get(key: string, type: "json"): Promise<unknown>
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>
}

/** The subset of the Workers `Cache` interface the cache uses. */
export type CacheLike = {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
}

export type DiscogsCacheEnv = {
  DISCOGS_CACHE?: KvNamespaceLike
}

const KV_KEY_PREFIX = "discogs:v1:"
const KV_RATE_LIMIT_KEY = "discogs:v1:rate-limited-until"
// Workers KV rejects expirationTtl values below 60 seconds.
const KV_MIN_TTL_SECONDS = 60
const CACHE_API_ORIGIN = "https://discogs-cache.internal"

type MemoryEntry = {
  expiresAt: number
  value: unknown
}

export function createMemoryCacheStore(): DiscogsCacheStore {
  const responses = new Map<string, MemoryEntry>()
  let rateLimitedUntil = 0

  return {
    async getResponse(key) {
      const entry = responses.get(key)
      if (!entry) return undefined
      if (entry.expiresAt <= Date.now()) {
        responses.delete(key)
        return undefined
      }
      return entry.value
    },
    async putResponse(key, value, ttlMs) {
      responses.set(key, { expiresAt: Date.now() + ttlMs, value })
    },
    async getRateLimitedUntil() {
      return rateLimitedUntil
    },
    async setRateLimitedUntil(until) {
      rateLimitedUntil = Math.max(rateLimitedUntil, until)
    },
  }
}

export function createKvCacheStore(kv: KvNamespaceLike): DiscogsCacheStore {
  return {
    async getResponse(key) {
      const entry = await kv.get(await getKvKey(key), "json")
      if (!isStoredEntry(entry) || entry.expiresAt <= Date.now()) return undefined
      return entry.value
    },
    async putResponse(key, value, ttlMs) {
      const entry = { expiresAt: Date.now() + ttlMs, value }
      await kv.put(await getKvKey(key), JSON.stringify(entry), {
        expirationTtl: toKvTtlSeconds(ttlMs),
      })
    },
    async getRateLimitedUntil() {
      const until = await kv.get(KV_RATE_LIMIT_KEY, "json")
      return typeof until === "number" ? until : 0
    },
    async setRateLimitedUntil(until) {
      await kv.put(KV_RATE_LIMIT_KEY, JSON.stringify(until), {
        expirationTtl: toKvTtlSeconds(until - Date.now()),
      })
    },
  }
}

export function createCacheApiStore(cache: CacheLike): DiscogsCacheStore {
  const rateLimitRequest = () =>
    new Request(`${CACHE_API_ORIGIN}/rate-limited-until`)

  return {
    async getResponse(key) {
      const response = await cache.match(toCacheRequest(key))
      if (!response) return undefined
      const entry: unknown = await response.json()
      if (!isStoredEntry(entry) || entry.expiresAt <= Date.now()) return undefined
      return entry.value
    },
    async putResponse(key, value, ttlMs) {
      const entry = { expiresAt: Date.now() + ttlMs, value }
      await cache.put(toCacheRequest(key), toCacheResponse(entry, ttlMs))
    },
    async getRateLimitedUntil() {
      const response = await cache.match(rateLimitRequest())
      if (!response) return 0
      const until: unknown = await response.json()
      return typeof until === "number" ? until : 0
    },
    async setRateLimitedUntil(until) {
      await cache.put(
        rateLimitRequest(),
        toCacheResponse(until, until - Date.now())
      )
    },
  }
}

/**
 * Reads the memory layer first, then the shared layer; writes go to both.
 * Failures of the shared layer are logged and treated as cache misses, so an
 * unavailable cache never breaks a Discogs request.
 */
export function createLayeredCacheStore(
  memory: DiscogsCacheStore,
  shared: DiscogsCacheStore
): DiscogsCacheStore {
  return {
    async getResponse(key) {
      const local = await memory.getResponse(key)
      if (local !== undefined) return local
      return safely("read", () => shared.getResponse(key), undefined)
    },
    async putResponse(key, value, ttlMs) {
      await memory.putResponse(key, value, ttlMs)
      await safely("write", () => shared.putResponse(key, value, ttlMs), undefined)
    },
    async getRateLimitedUntil() {
      const [local, remote] = await Promise.all([
        memory.getRateLimitedUntil(),
        safely("read", () => shared.getRateLimitedUntil(), 0),
      ])
      return Math.max(local, remote)
    },
    async setRateLimitedUntil(until) {
      await memory.setRateLimitedUntil(until)
      await safely("write", () => shared.setRateLimitedUntil(until), undefined)
    },
  }
}

const isolateMemoryStore = createMemoryCacheStore()

/** Picks the best available shared cache for the current runtime. */
export function createDiscogsCache(
  env: DiscogsCacheEnv = {},
  {
    memory = isolateMemoryStore,
    cacheStorage = getDefaultCacheStorage(),
  }: {
    memory?: DiscogsCacheStore
    cacheStorage?: CacheLike | null
  } = {}
): DiscogsCacheStore {
  if (env.DISCOGS_CACHE) {
    return createLayeredCacheStore(memory, createKvCacheStore(env.DISCOGS_CACHE))
  }
  if (cacheStorage) {
    return createLayeredCacheStore(memory, createCacheApiStore(cacheStorage))
  }
  return memory
}

function getDefaultCacheStorage(): CacheLike | null {
  const storage = (globalThis as { caches?: { default?: CacheLike } }).caches
  return storage?.default ?? null
}

function toCacheRequest(key: string) {
  return new Request(`${CACHE_API_ORIGIN}/response?key=${encodeURIComponent(key)}`)
}

function toCacheResponse(value: unknown, ttlMs: number) {
  return new Response(JSON.stringify(value), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${Math.max(1, Math.ceil(ttlMs / 1000))}`,
    },
  })
}

function toKvTtlSeconds(ttlMs: number) {
  return Math.max(KV_MIN_TTL_SECONDS, Math.ceil(ttlMs / 1000))
}

async function getKvKey(key: string) {
  // KV keys are limited to 512 bytes; Discogs URLs with filters can be longer.
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key)
  )
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
  return `${KV_KEY_PREFIX}${hex}`
}

function isStoredEntry(value: unknown): value is MemoryEntry {
  return Boolean(
    value &&
      typeof value === "object" &&
      "expiresAt" in value &&
      typeof value.expiresAt === "number" &&
      "value" in value
  )
}

async function safely<T>(
  action: "read" | "write",
  run: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await run()
  } catch (error) {
    console.warn(`Discogs shared cache ${action} failed:`, error)
    return fallback
  }
}
