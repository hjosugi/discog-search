import { expect, test } from "@playwright/test"

test("shows an initial guide before searching", async ({ page }) => {
  await page.goto("/search")

  await expect(
    page.getByRole("heading", { name: "Start with a credit, song, or genre" })
  ).toBeVisible()
  await expect(page.getByRole("link", { name: "credit: Tony Williams" })).toBeVisible()
  await expect(page.getByRole("link", { name: "song: Nefertiti" })).toBeVisible()
})

test("searches mocked Discogs results and opens album details", async ({ page }) => {
  await page.goto("/search")
  await expect(page.getByRole("heading", { name: "Sideman Album Finder" })).toBeVisible()
  await page.waitForLoadState("networkidle")
  const documentSearchRequests: string[] = []
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (request.resourceType() === "document" && url.pathname === "/search") {
      documentSearchRequests.push(request.url())
    }
  })

  await page
    .getByPlaceholder("Credit / performer, e.g. Tony Williams")
    .fill("Tony Williams")
  await page
    .getByPlaceholder("Song / track, e.g. Night in Tunisia")
    .fill("Nefertiti")
  await page.getByRole("button", { name: "Search" }).click()

  await expect(page).toHaveURL(/credit=Tony\+Williams/)
  expect(documentSearchRequests).toEqual([])
  await expect(page.getByText("1 albums")).toBeVisible()
  await expect(page.getByText("Miles Davis - Nefertiti")).toBeVisible()

  await page.getByText("Miles Davis - Nefertiti").click()

  await expect(
    page.getByRole("heading", { name: "Miles Davis - Nefertiti" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Nefertiti", exact: true })
  ).toBeVisible()
  await expect(page.getByRole("link", { name: "Tony Williams" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Drums" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Trumpet" })).toBeVisible()
  await expect(page.getByRole("link", { name: /^vocals$/i })).toHaveCount(0)

  await page.getByRole("link", { name: "Tony Williams" }).click()

  await expect(page).toHaveURL(/\/search\?credit=Tony\+Williams$/)
  await expect(page.getByText("1 albums")).toBeVisible()

  await page.goBack()

  await expect(
    page.getByRole("heading", { name: "Nefertiti", exact: true })
  ).toBeVisible()

  await page.getByRole("link", { name: "Trumpet" }).click()

  await expect(page).toHaveURL(/role=Trumpet/)
  await expect(page.getByRole("link", { name: "Miles Davis" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Tony Williams" })).toHaveCount(0)
})

test("restores submitted search state with browser back and forward", async ({ page }) => {
  await page.goto("/search")

  const creditInput = page.getByPlaceholder("Credit / performer, e.g. Tony Williams")

  await creditInput.fill("Tony Williams")
  await page.getByRole("button", { name: "Search" }).click()
  await expect(page.getByText("1 albums")).toBeVisible()
  await expect(creditInput).toHaveValue("Tony Williams")

  await creditInput.fill("No Match")
  await page.getByRole("button", { name: "Search" }).click()
  await expect(
    page.getByRole("heading", { name: 'No albums found for credit "No Match"' })
  ).toBeVisible()
  await expect(creditInput).toHaveValue("No Match")

  await page.goBack()
  await expect(page).toHaveURL(/credit=Tony\+Williams/)
  await expect(page.getByText("1 albums")).toBeVisible()
  await expect(creditInput).toHaveValue("Tony Williams")

  await page.goForward()
  await expect(page).toHaveURL(/credit=No\+Match/)
  await expect(
    page.getByRole("heading", { name: 'No albums found for credit "No Match"' })
  ).toBeVisible()
  await expect(creditInput).toHaveValue("No Match")
})

test("does not fetch suggestions while the suggestion panel is closed", async ({ page }) => {
  const suggestionRequests: string[] = []
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (url.pathname === "/search/suggestions") {
      suggestionRequests.push(request.url())
    }
  })

  await page.goto("/search")

  const songInput = page.getByPlaceholder("Song / track, e.g. Night in Tunisia")
  await songInput.fill("Nef")
  await songInput.blur()
  await page.waitForTimeout(800)

  expect(suggestionRequests).toEqual([])
})

test("shows an empty state when a search has no results", async ({ page }) => {
  await page.goto("/search")

  await page
    .getByPlaceholder("Credit / performer, e.g. Tony Williams")
    .fill("No Match")
  await page.getByRole("button", { name: "Search" }).click()

  await expect(page).toHaveURL(/credit=No\+Match/)
  await expect(
    page.getByRole("heading", { name: 'No albums found for credit "No Match"' })
  ).toBeVisible()
  await expect(page.getByText("Check alternate spellings")).toBeVisible()

  await page.getByRole("link", { name: "Remove credit" }).click()

  await expect(page).toHaveURL(/\/search$/)
  await expect(
    page.getByRole("heading", { name: "Start with a credit, song, or genre" })
  ).toBeVisible()
})

test("shows pending UI while search results load", async ({ page }) => {
  await page.goto("/search")

  await page
    .getByPlaceholder("Credit / performer, e.g. Tony Williams")
    .fill("Slow Search")
  await page.getByRole("button", { name: "Search" }).click()

  await expect(page.getByText("Searching albums").first()).toBeVisible()
  await expect(page.getByRole("button", { name: "Searching" })).toBeDisabled()
  await expect(page.getByText("Miles Davis - Nefertiti")).toBeVisible()
})
