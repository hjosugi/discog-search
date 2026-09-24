/**
 * Error thrown for any non-successful Discogs request. `status` mirrors the
 * HTTP status Discogs returned (or 502 for responses that could not be used).
 */
export class DiscogsFetchError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "DiscogsFetchError"
    this.status = status
  }
}

/**
 * Thrown when Discogs answered 429, and for every request made while the
 * shared cooldown after a 429 is still active. This replaces the former
 * `{ results: [], rateLimited: true }` sentinel response.
 */
export class DiscogsRateLimitError extends DiscogsFetchError {
  retryAt: number

  constructor(retryAt: number, message = "Discogs rate limit is active.") {
    super(message, 429)
    this.name = "DiscogsRateLimitError"
    this.retryAt = retryAt
  }
}

/**
 * Thrown when a Discogs payload does not match the schema the app relies on,
 * so shape drift fails loudly at the boundary instead of deep in the UI.
 */
export class DiscogsResponseError extends DiscogsFetchError {
  endpoint: string

  constructor(endpoint: string, details: string) {
    super(`Discogs returned an unexpected response for ${endpoint}: ${details}`, 502)
    this.name = "DiscogsResponseError"
    this.endpoint = endpoint
  }
}
