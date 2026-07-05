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

  await page
    .getByPlaceholder("Credit / performer, e.g. Tony Williams")
    .fill("Tony Williams")
  await page
    .getByPlaceholder("Song / track, e.g. Night in Tunisia")
    .fill("Nefertiti")
  await page.getByRole("button", { name: "Search" }).click()

  await expect(page).toHaveURL(/credit=Tony\+Williams/)
  await expect(page.getByText("1 albums")).toBeVisible()
  await expect(page.getByText("Miles Davis - Nefertiti")).toBeVisible()

  await page.getByText("Miles Davis - Nefertiti").click()

  await expect(
    page.getByRole("heading", { name: "Miles Davis - Nefertiti" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Nefertiti", exact: true })
  ).toBeVisible()
  await expect(page.getByText("Tony Williams")).toBeVisible()
  await expect(page.getByText("Drums", { exact: true })).toBeVisible()
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
