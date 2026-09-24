import {
  createDiscogsCache,
  type DiscogsCacheEnv,
  type DiscogsCacheStore,
} from "./cache"
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
 * caching (memory + KV or Cache API), in-flight request coalescing, and the
 * 429 cooldown shared across isolates. It returns raw
 * JSON; use the typed functions in `./api` to get validated payloads.
 */
export type DiscogsClient = {
  request(endpoint: string, params?: DiscogsQuery): Promise<unknown>
}

const CACHE_TTL_MS = 10 * 60 * 1000
const RATE_LIMIT_FALLBACK_MS = 30 * 1000
const MAX_ERROR_BODY_BYTES = 2048
const DISCOGS_API_BASE_URL = "https://api.discogs.com"

// Coalesces identical in-flight requests inside one isolate.
const isolatePendingRequests = new Map<string, Promise<unknown>>()

export type DiscogsClientOptions = {
  /** Response cache and shared 429 cooldown; see `createDiscogsCache()`. */
  cache?: DiscogsCacheStore
  pending?: Map<string, Promise<unknown>>
}

export function createDiscogsClient(
  env: DiscogsEnv & DiscogsCacheEnv = {},
  {
    cache = createDiscogsCache(env),
    pending = isolatePendingRequests,
  }: DiscogsClientOptions = {}
): DiscogsClient {
  return {
    async request(endpoint: string, params: DiscogsQuery = {}) {
      const url = getDiscogsApiUrl(endpoint, env)

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.append(key, String(value))
        }
      })

      const cacheKey = url.toString()
      // Cached data is served even during a cooldown.
      const cached = await cache.getResponse(cacheKey)
      if (cached !== undefined) {
        return cached
      }

      const rateLimitedUntil = await cache.getRateLimitedUntil()
      if (Date.now() < rateLimitedUntil) {
        throw new DiscogsRateLimitError(rateLimitedUntil)
      }

      const pendingRequest = pending.get(cacheKey)
      if (pendingRequest) {
        return pendingRequest
      }

      const request = fetch(cacheKey, { headers: getDiscogsHeaders(env) })
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
              const until = Date.now() + getRateLimitTtl(response)
              await cache.setRateLimitedUntil(until)
              throw new DiscogsRateLimitError(until, message)
            }

            throw new DiscogsFetchError(message, response.status)
          }

          const json: unknown = await response.json()
          await cache.putResponse(cacheKey, json, CACHE_TTL_MS)
          return json
        })
        .finally(() => {
          pending.delete(cacheKey)
        })

      pending.set(cacheKey, request)
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
