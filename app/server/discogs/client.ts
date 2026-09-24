import { DiscogsFetchError, DiscogsRateLimitError } from "./errors"

export type DiscogsEnv = {
  DISCOGS_API_BASE_URL?: string
  DISCOGS_TOKEN?: string
  DISCOGS_API_KEY?: string
  DISCOGS_API_SECRET?: string
}

export type DiscogsQuery = Record<string, string | number | null | undefined>

/**
 * Low-level Discogs HTTP client: authentication, query building, response
 * caching, in-flight request coalescing, and the 429 cooldown. It returns raw
 * JSON; use the typed functions in `./api` to get validated payloads.
 */
export type DiscogsClient = {
  request(endpoint: string, params?: DiscogsQuery): Promise<unknown>
}

type CacheEntry = {
  expiresAt: number
  value: unknown
}

export type MemoryCache = {
  responses: Map<string, CacheEntry>
  pending: Map<string, Promise<unknown>>
  rateLimitedUntil: number
}

const CACHE_TTL_MS = 10 * 60 * 1000
const RATE_LIMIT_FALLBACK_MS = 30 * 1000
const MAX_ERROR_BODY_BYTES = 2048
const DISCOGS_API_BASE_URL = "https://api.discogs.com"

const globalMemoryCache = createMemoryCache()

export function createMemoryCache(): MemoryCache {
  return {
    responses: new Map(),
    pending: new Map(),
    rateLimitedUntil: 0,
  }
}

export function createDiscogsClient(
  env: DiscogsEnv = {},
  cache = globalMemoryCache
): DiscogsClient {
  return {
    async request(endpoint: string, params: DiscogsQuery = {}) {
      const url = getDiscogsApiUrl(endpoint, env)

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.append(key, String(value))
        }
      })

      if (Date.now() < cache.rateLimitedUntil) {
        throw new DiscogsRateLimitError(cache.rateLimitedUntil)
      }

      const cacheKey = url.toString()
      const cached = cache.responses.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value
      }
      if (cached) {
        cache.responses.delete(cacheKey)
      }

      const pendingRequest = cache.pending.get(cacheKey)
      if (pendingRequest) {
        return pendingRequest
      }

      const request = fetch(url.toString(), { headers: getDiscogsHeaders(env) })
        .then(async (response) => {
          if (!response.ok) {
            const details = await readLimitedText(response, MAX_ERROR_BODY_BYTES)
            const message = [
              `Discogs API request error (${response.status})`,
              response.statusText,
              details,
            ]
              .filter(Boolean)
              .join(": ")

            if (response.status === 429) {
              cache.rateLimitedUntil = Date.now() + getRateLimitTtl(response)
              throw new DiscogsRateLimitError(cache.rateLimitedUntil, message)
            }

            throw new DiscogsFetchError(message, response.status)
          }

          const json: unknown = await response.json()
          cache.responses.set(cacheKey, {
            expiresAt: Date.now() + CACHE_TTL_MS,
            value: json,
          })
          return json
        })
        .finally(() => {
          cache.pending.delete(cacheKey)
        })

      cache.pending.set(cacheKey, request)
      return request
    },
  }
}

function getDiscogsApiUrl(endpoint: string, env: DiscogsEnv) {
  const baseUrl = env.DISCOGS_API_BASE_URL || DISCOGS_API_BASE_URL
  return new URL(endpoint.replace(/^\/+/, ""), `${baseUrl.replace(/\/+$/, "")}/`)
}

function getDiscogsHeaders(env: DiscogsEnv) {
  const headers = new Headers({
    "User-Agent": "discog-search/0.1",
  })
  const token = env.DISCOGS_TOKEN
  const key = env.DISCOGS_API_KEY
  const secret = env.DISCOGS_API_SECRET

  if (token) {
    headers.set("Authorization", `Discogs token=${token}`)
  } else if (key && secret) {
    headers.set("Authorization", `Discogs key=${key}, secret=${secret}`)
  }

  return headers
}

function getRateLimitTtl(response: Response) {
  const retryAfter = response.headers.get("Retry-After")
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000
  }

  return RATE_LIMIT_FALLBACK_MS
}

async function readLimitedText(response: Response, maxBytes: number) {
  if (!response.body) return ""

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  try {
    while (received < maxBytes) {
      const { done, value } = await reader.read()
      if (done || !value) break
      const remaining = maxBytes - received
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value
      chunks.push(chunk)
      received += chunk.byteLength
      if (value.byteLength > remaining) break
    }
  } finally {
    reader.releaseLock()
  }

  return new TextDecoder().decode(concatChunks(chunks, received))
}

function concatChunks(chunks: Uint8Array[], totalBytes: number) {
  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}
