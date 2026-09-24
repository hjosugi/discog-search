import type { localStorageManager } from "@chakra-ui/react"

type StorageManager = typeof localStorageManager

/**
 * Color mode preference. "system" follows the OS setting, including changes
 * while the page is open; "light" and "dark" are explicit user choices.
 *
 * Chakra's own manager stores the *resolved* mode, which would turn the first
 * system-derived value into a permanent choice. This manager stores only the
 * preference the user picked, and resolves "system" at read time.
 */
export type ColorModePreference = "light" | "dark" | "system"

export const COLOR_MODE_STORAGE_KEY = "discog-search:color-mode"

const DARK_QUERY = "(prefers-color-scheme: dark)"

export function isColorModePreference(value: unknown): value is ColorModePreference {
  return value === "light" || value === "dark" || value === "system"
}

export function resolveColorMode(
  preference: ColorModePreference,
  prefersDark: boolean
): "light" | "dark" {
  if (preference === "system") return prefersDark ? "dark" : "light"
  return preference
}

export function readColorModePreference(): ColorModePreference {
  try {
    const value = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)
    return isColorModePreference(value) ? value : "system"
  } catch {
    return "system"
  }
}

export function writeColorModePreference(preference: ColorModePreference) {
  try {
    if (preference === "system") {
      window.localStorage.removeItem(COLOR_MODE_STORAGE_KEY)
    } else {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, preference)
    }
  } catch {
    // Storage may be unavailable (private mode); the choice lasts this visit.
  }
}

export function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches
}

export function subscribeToSystemColorMode(onChange: (isDark: boolean) => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {}
  const query = window.matchMedia(DARK_QUERY)
  const handleChange = (event: MediaQueryListEvent) => onChange(event.matches)
  query.addEventListener("change", handleChange)
  return () => query.removeEventListener("change", handleChange)
}

export const colorModeManager: StorageManager = {
  type: "localStorage",
  ssr: false,
  get() {
    if (typeof window === "undefined") return undefined
    return resolveColorMode(readColorModePreference(), systemPrefersDark())
  },
  set() {
    // Chakra calls this with resolved values; explicit choices are written by
    // writeColorModePreference() instead.
  },
}

/**
 * Inline script for <head>: applies the stored or system color mode before
 * first paint, so a dark-mode visitor never sees a light flash.
 */
export const colorModeScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  COLOR_MODE_STORAGE_KEY
)});var d=window.matchMedia(${JSON.stringify(
  DARK_QUERY
)}).matches;var m=p==="light"||p==="dark"?p:(d?"dark":"light");var e=document.documentElement;e.dataset.theme=m;e.style.colorScheme=m}catch(_){}})()`
