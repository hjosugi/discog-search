import { en, ja, type MessageKey, type Messages } from "./messages"

export const LOCALES = ["en", "ja"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "en"
export const LOCALE_COOKIE = "lang"

const dictionaries: Record<Locale, Messages> = { en, ja }

export type TranslationParams = Record<string, string | number>
export type Translate = (key: MessageKey, params?: TranslationParams) => string

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}

export function translate(
  locale: Locale,
  key: MessageKey,
  params: TranslationParams = {}
) {
  const template = dictionaries[locale][key] ?? en[key]
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  )
}

export function createTranslator(locale: Locale): Translate {
  return (key, params) => translate(locale, key, params)
}

export function formatNumber(locale: Locale, value: number) {
  return value.toLocaleString(locale === "ja" ? "ja-JP" : "en-US")
}

export function formatDate(locale: Locale, value: number | Date) {
  return new Date(value).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US")
}

/** Reads the `lang` cookie value from a Cookie header or `document.cookie`. */
export function getLocaleFromCookie(cookie: string | null | undefined) {
  const match = cookie?.match(/(?:^|;\s*)lang=([^;]+)/)
  const value = match ? decodeURIComponent(match[1]) : null
  return isLocale(value) ? value : null
}

/**
 * Picks the best supported locale from an Accept-Language header (or a
 * navigator.languages list), honouring q-values.
 */
export function negotiateLocale(
  acceptLanguage: string | readonly string[] | null | undefined
): Locale {
  const ranges =
    typeof acceptLanguage === "string"
      ? acceptLanguage.split(",").map((part, index) => {
          const [tag, ...params] = part.trim().split(";")
          const quality = params
            .map((param) => param.trim().match(/^q=([0-9.]+)$/)?.[1])
            .find(Boolean)
          return { tag, quality: quality ? Number(quality) : 1, index }
        })
      : (acceptLanguage || []).map((tag, index) => ({ tag, quality: 1, index }))

  const best = ranges
    .filter((range) => range.tag && range.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)
    .map((range) => range.tag.toLowerCase().split("-")[0])
    .find(isLocale)

  return best ?? DEFAULT_LOCALE
}

/** Server-side choice: explicit cookie first, then Accept-Language. */
export function resolveRequestLocale(request: Request): Locale {
  return (
    getLocaleFromCookie(request.headers.get("Cookie")) ??
    negotiateLocale(request.headers.get("Accept-Language"))
  )
}

export function buildLocaleCookie(locale: Locale) {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`
}

/** Localized text for an API error code, falling back to the server message. */
export function translateApiError(
  t: Translate,
  code: string | undefined,
  fallback: string
) {
  switch (code) {
    case "discogs_auth":
    case "discogs_rate_limited":
    case "discogs_not_found":
    case "discogs_bad_response":
    case "discogs_error":
    case "bad_request":
    case "internal":
      return t(`error.${code}`)
    default:
      return fallback
  }
}
