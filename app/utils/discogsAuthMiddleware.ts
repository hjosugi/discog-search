export class DiscogsFetchError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "DiscogsFetchError"
    this.status = status
  }
}

const CACHE_TTL_MS = 10 * 60 * 1000
const RATE_LIMIT_FALLBACK_MS = 30 * 1000
const responseCache = new Map<
  string,
  {
    expiresAt: number
    value: unknown
  }
>()
const pendingRequests = new Map<string, Promise<unknown>>()
let rateLimitedUntil = 0

export async function discogsFetch<T = unknown>(
  endpoint: string,
  params: Record<string, string | number | null | undefined> = {}
): Promise<T> {
  const API_URL = `https://api.discogs.com/${endpoint}`
  const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN
  const DISCOGS_API_KEY = process.env.DISCOGS_API_KEY
  const DISCOGS_API_SECRET = process.env.DISCOGS_API_SECRET

  const url = new URL(API_URL)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value))
    }
  })

  if (Date.now() < rateLimitedUntil) {
    return getRateLimitedResponse() as T
  }

  const cacheKey = url.toString()
  const cached = responseCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T
  }

  const pendingRequest = pendingRequests.get(cacheKey)
  if (pendingRequest) {
    return pendingRequest as Promise<T>
  }

  const headers = new Headers({
    "User-Agent": "discog-search/0.1",
  })

  if (DISCOGS_TOKEN) {
    headers.set("Authorization", `Discogs token=${DISCOGS_TOKEN}`)
  } else if (DISCOGS_API_KEY && DISCOGS_API_SECRET) {
    headers.set(
      "Authorization",
      `Discogs key=${DISCOGS_API_KEY}, secret=${DISCOGS_API_SECRET}`
    )
  }

  const request = fetch(url.toString(), { headers })
    .then(async (response) => {
      if (!response.ok) {
        const details = await response.text()
        const message = [
          `Discogs API request error (${response.status})`,
          response.statusText,
          details,
        ]
          .filter(Boolean)
          .join(": ")

        if (response.status === 429) {
          const ttl = getRateLimitTtl(response)
          rateLimitedUntil = Date.now() + ttl
          responseCache.set(cacheKey, {
            expiresAt: rateLimitedUntil,
            value: getRateLimitedResponse(),
          })
        }

        throw new DiscogsFetchError(message, response.status)
      }

      const json = await response.json()
      responseCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: json,
      })
      return json
    })
    .finally(() => {
      pendingRequests.delete(cacheKey)
    })

  pendingRequests.set(cacheKey, request)
  return request as Promise<T>
}

function getRateLimitedResponse() {
  return {
    results: [],
    pagination: { page: 1, pages: 1 },
    rateLimited: true,
  }
}

function getRateLimitTtl(response: Response) {
  const retryAfter = response.headers.get("Retry-After")
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000
  }

  return RATE_LIMIT_FALLBACK_MS
}
