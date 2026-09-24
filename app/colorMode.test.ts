import { afterEach, describe, expect, it, vi } from "vitest"

import {
  COLOR_MODE_STORAGE_KEY,
  colorModeManager,
  colorModeScript,
  readColorModePreference,
  resolveColorMode,
  writeColorModePreference,
} from "./colorMode"

function stubBrowser({
  stored,
  prefersDark,
}: {
  stored?: string
  prefersDark: boolean
}) {
  const values = new Map<string, string>()
  if (stored) values.set(COLOR_MODE_STORAGE_KEY, stored)
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
  const matchMedia = () => ({ matches: prefersDark })
  const documentElement = { dataset: {} as Record<string, string>, style: {} as Record<string, string> }

  vi.stubGlobal("localStorage", localStorage)
  vi.stubGlobal("window", { localStorage, matchMedia })
  vi.stubGlobal("document", { documentElement })
  return { values, documentElement }
}

describe("color mode preference", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("resolves system to the OS setting and keeps explicit choices", () => {
    expect(resolveColorMode("system", true)).toBe("dark")
    expect(resolveColorMode("system", false)).toBe("light")
    expect(resolveColorMode("light", true)).toBe("light")
    expect(resolveColorMode("dark", false)).toBe("dark")
  })

  it("stores explicit choices and forgets them for system", () => {
    const { values } = stubBrowser({ prefersDark: false })

    writeColorModePreference("dark")
    expect(values.get(COLOR_MODE_STORAGE_KEY)).toBe("dark")
    expect(readColorModePreference()).toBe("dark")

    writeColorModePreference("system")
    expect(values.has(COLOR_MODE_STORAGE_KEY)).toBe(false)
    expect(readColorModePreference()).toBe("system")
  })

  it("gives Chakra the resolved mode and never persists Chakra's writes", () => {
    const { values } = stubBrowser({ prefersDark: true })

    expect(colorModeManager.get()).toBe("dark")
    colorModeManager.set("light")
    expect(values.size).toBe(0)
    expect(colorModeManager.get()).toBe("dark")
  })

  it("applies the mode before paint from the inline script", () => {
    const system = stubBrowser({ prefersDark: true })
    new Function(colorModeScript)()
    expect(system.documentElement.dataset.theme).toBe("dark")
    expect(system.documentElement.style.colorScheme).toBe("dark")

    const explicit = stubBrowser({ stored: "light", prefersDark: true })
    new Function(colorModeScript)()
    expect(explicit.documentElement.dataset.theme).toBe("light")
  })
})
