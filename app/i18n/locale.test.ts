import { describe, expect, it } from "vitest"

import {
  buildLocaleCookie,
  getLocaleFromCookie,
  negotiateLocale,
  resolveRequestLocale,
  translate,
  translateApiError,
  createTranslator,
} from "./locale"
import { en, ja } from "./messages"

const placeholders = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

describe("messages", () => {
  it("defines every English key in Japanese with a non-empty value", () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort())
    for (const [key, value] of Object.entries(ja)) {
      expect(value.trim(), key).not.toBe("")
    }
  })

  it("uses the same placeholders in both languages", () => {
    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      expect(placeholders(ja[key]), key).toEqual(placeholders(en[key]))
    }
  })
})

describe("translate", () => {
  it("fills placeholders and leaves unknown ones visible", () => {
    expect(translate("en", "search.summary.partial", { count: 2, total: 5 })).toBe(
      "2 of 5 albums"
    )
    expect(translate("ja", "search.summary.partial", { count: 2, total: 5 })).toBe(
      "5 件中 2 件のアルバム"
    )
    expect(translate("en", "results.showing", { count: 1 })).toBe(
      "Showing 1 of {total} albums"
    )
  })

  it("localizes API error codes and falls back to the server message", () => {
    const t = createTranslator("ja")
    expect(translateApiError(t, "discogs_rate_limited", "fallback")).toBe(
      ja["error.discogs_rate_limited"]
    )
    expect(translateApiError(t, "unknown_code", "fallback")).toBe("fallback")
    expect(translateApiError(t, undefined, "fallback")).toBe("fallback")
  })
})

describe("locale negotiation", () => {
  it("picks the best supported Accept-Language entry", () => {
    expect(negotiateLocale("ja-JP,ja;q=0.9,en-US;q=0.8")).toBe("ja")
    expect(negotiateLocale("fr-FR,fr;q=0.9,ja;q=0.5,en;q=0.7")).toBe("en")
    expect(negotiateLocale("en;q=0.1, ja;q=0.9")).toBe("ja")
    expect(negotiateLocale("de-DE")).toBe("en")
    expect(negotiateLocale("")).toBe("en")
    expect(negotiateLocale(null)).toBe("en")
    expect(negotiateLocale(["ja-JP", "en-US"])).toBe("ja")
  })

  it("prefers an explicit lang cookie over Accept-Language", () => {
    const request = new Request("https://app.test/search", {
      headers: {
        Cookie: "theme=dark; lang=en",
        "Accept-Language": "ja-JP,ja;q=0.9",
      },
    })
    expect(resolveRequestLocale(request)).toBe("en")
    expect(
      resolveRequestLocale(
        new Request("https://app.test/", { headers: { "Accept-Language": "ja" } })
      )
    ).toBe("ja")
  })

  it("reads and writes the lang cookie", () => {
    expect(getLocaleFromCookie("a=1; lang=ja")).toBe("ja")
    expect(getLocaleFromCookie("lang=xx")).toBeNull()
    expect(getLocaleFromCookie(undefined)).toBeNull()
    expect(buildLocaleCookie("ja")).toBe(
      "lang=ja; Path=/; Max-Age=31536000; SameSite=Lax"
    )
  })
})
