import { describe, expect, it } from "vitest"

import { createServerApp } from "./app"
import { localizeHtmlResponse } from "./html"

const shell = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'

describe("localizeHtmlResponse", () => {
  it("writes the locale into the html element and varies the cache", async () => {
    const response = await localizeHtmlResponse(
      new Response(shell, {
        headers: { "Content-Type": "text/html; charset=utf-8", ETag: '"abc"' },
      }),
      "ja"
    )

    await expect(response.text()).resolves.toBe(
      '<!DOCTYPE html><html lang="ja" data-locale="ja"><head></head><body></body></html>'
    )
    expect(response.headers.get("ETag")).toBeNull()
    expect(response.headers.get("Vary")).toBe("Cookie, Accept-Language")
  })

  it("leaves non-HTML responses untouched", async () => {
    const original = new Response("body{}", {
      headers: { "Content-Type": "text/css" },
    })
    expect(await localizeHtmlResponse(original, "ja")).toBe(original)
  })
})

describe("SPA shell locale", () => {
  const assets = {
    fetch: () =>
      new Response(shell, { headers: { "Content-Type": "text/html" } }),
  }

  it("negotiates the locale from Accept-Language", async () => {
    const app = createServerApp({ env: { ASSETS: assets } })
    const response = await app.handle(
      new Request("https://app.test/search", {
        headers: { "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8" },
      })
    )

    expect(await response.text()).toContain('<html lang="ja" data-locale="ja">')
  })

  it("keeps an explicit language choice from the cookie", async () => {
    const app = createServerApp({ env: { ASSETS: assets } })
    const response = await app.handle(
      new Request("https://app.test/search", {
        headers: { "Accept-Language": "ja", Cookie: "lang=en" },
      })
    )

    expect(await response.text()).toContain('<html lang="en" data-locale="en">')
  })
})
