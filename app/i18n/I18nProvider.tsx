import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import {
  buildLocaleCookie,
  createTranslator,
  DEFAULT_LOCALE,
  formatDate,
  formatNumber,
  getLocaleFromCookie,
  isLocale,
  negotiateLocale,
  type Locale,
  type Translate,
} from "./locale"

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translate
  formatNumber: (value: number) => string
  formatDate: (value: number | Date) => string
}

/**
 * Initial client locale: an explicit choice in the `lang` cookie, else the
 * locale the Worker negotiated from Accept-Language and wrote into
 * `<html data-locale>`, else the browser languages (plain Vite dev, where no
 * Worker rewrites the HTML).
 */
export function detectClientLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE

  const negotiated = document.documentElement.dataset.locale
  return (
    getLocaleFromCookie(document.cookie) ??
    (isLocale(negotiated) ? negotiated : negotiateLocale(navigator.languages))
  )
}

// A module-level store: the prerendered SPA shell is hydrated with the
// default locale (server snapshot) and React switches to the detected locale
// right after hydration, without a hydration mismatch.
let currentLocale: Locale | null = null
const listeners = new Set<() => void>()

function getLocaleSnapshot() {
  currentLocale ??= detectClientLocale()
  return currentLocale
}

function getServerLocaleSnapshot() {
  return DEFAULT_LOCALE
}

function subscribeToLocale(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function setLocale(locale: Locale) {
  document.cookie = buildLocaleCookie(locale)
  currentLocale = locale
  listeners.forEach((listener) => listener())
}

/**
 * The locale for code that runs outside React, such as route `meta()`
 * functions.
 */
export function getActiveLocale() {
  return typeof document === "undefined" ? DEFAULT_LOCALE : getLocaleSnapshot()
}

export function useLocale() {
  return useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot
  )
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocale()

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: createTranslator(locale),
      formatNumber: (number) => formatNumber(locale, number),
      formatDate: (date) => formatDate(locale, date),
    }),
    [locale]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used inside <I18nProvider>")
  }
  return context
}
