import { treaty } from "@elysiajs/eden"

import type { App } from "../server/app"
import type { ApiErrorCode } from "../server/data"

// Eden would otherwise revive date-looking strings into Date objects. Discogs
// fields such as `released: "1986-06-01"` (or a track titled like a date)
// must stay strings, so date parsing is disabled.
export const api = treaty<App>(getApiOrigin(), { parseDate: false })

export function toQueryObject(searchParams: URLSearchParams) {
  return Object.fromEntries(searchParams.entries())
}

export function getApiErrorMessage(
  error: { value: unknown } | null,
  fallback: string
) {
  const value = error?.value

  if (typeof value === "string") return value
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error
  }

  return fallback
}

const API_ERROR_CODES: readonly ApiErrorCode[] = [
  "discogs_auth",
  "discogs_rate_limited",
  "discogs_not_found",
  "discogs_bad_response",
  "discogs_error",
  "bad_request",
  "internal",
]

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && API_ERROR_CODES.includes(value as ApiErrorCode)
}

/** The stable error code of an API error response, used for localized text. */
export function getApiErrorCode(error: { value: unknown } | null) {
  const value = error?.value
  if (value && typeof value === "object" && "code" in value) {
    return isApiErrorCode(value.code) ? value.code : undefined
  }
  return undefined
}

function getApiOrigin() {
  return typeof window === "undefined" ? "http://localhost" : window.location.origin
}
