import { expect, test, type Locator, type Page } from "@playwright/test"

const VIEWPORT = { width: 375, height: 667 }

test.use({ viewport: VIEWPORT, hasTouch: true, isMobile: true })

async function expectInFirstView(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(VIEWPORT.height)
}

async function expectNoHorizontalScroll(page: Page) {
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(VIEWPORT.width)
}

async function expectTapTarget(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
}

test("keeps the search form compact with extra filters folded away", async ({ page }) => {
  await page.goto("/search")

  const credit = page.getByRole("textbox", { name: "Credit / performer" })
  const song = page.getByRole("combobox", { name: "Song / track" })
  const submit = page.getByRole("button", { name: "Search", exact: true })
  const moreFilters = page.getByRole("button", { name: "More filters" })

  await expectInFirstView(credit)
  await expectInFirstView(song)
  await expectInFirstView(submit)
  await expectInFirstView(moreFilters)
  await expect(page.getByLabel("Genre")).toBeHidden()
  await expect(page.getByLabel("Year")).toBeHidden()
  await expect(moreFilters).toHaveAttribute("aria-expanded", "false")
  for (const target of [credit, song, submit, moreFilters]) {
    await expectTapTarget(target)
  }
  await expectNoHorizontalScroll(page)

  await moreFilters.click()
  await expect(moreFilters).toHaveAttribute("aria-expanded", "true")
  await page.getByLabel("Genre").fill("Jazz")
  await expect(page.getByLabel("Year")).toBeVisible()
  await expectTapTarget(page.getByRole("button", { name: "1960s" }))

  await moreFilters.click()
  await expect(page.getByRole("button", { name: "More filters (1)" })).toBeVisible()
})

test("switches tracks and reads their credits without leaving the screen", async ({ page }) => {
  await page.goto("/search/1001?kind=release&song=Nefertiti")

  const tabs = page.getByRole("tablist", { name: "Album sections" })
  const performersTab = tabs.getByRole("tab", { name: "Performers" })
  const tracksTab = tabs.getByRole("tab", { name: "Tracks (3)" })
  await expect(performersTab).toHaveAttribute("aria-selected", "true")
  await expectTapTarget(tracksTab)
  await expect(page.getByRole("link", { name: "Herbie Hancock" })).toBeVisible()
  await expectNoHorizontalScroll(page)

  await tracksTab.click()
  const fall = page.getByRole("link", { name: /Fall\s*A2/ })
  await expect(fall).toBeVisible()
  await expectTapTarget(fall)
  await fall.click()

  await expect(page).toHaveURL(/track=A2/)
  await expect(performersTab).toHaveAttribute("aria-selected", "true")
  await expect(page.getByRole("heading", { level: 2, name: "Fall" })).toBeVisible()
  const tonyWilliams = page.getByRole("link", { name: "Tony Williams" })
  await expect(tonyWilliams).toBeVisible()
  await expect(page.getByRole("link", { name: "Herbie Hancock" })).toHaveCount(0)
  await expectInFirstView(tonyWilliams)
})
