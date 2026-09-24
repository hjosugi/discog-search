import { treaty } from "@elysiajs/eden"

import type { App } from "../server/app"

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

function getApiOrigin() {
  return typeof window === "undefined" ? "http://localhost" : window.location.origin
}
