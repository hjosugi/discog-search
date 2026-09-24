import { expect, test, type Page } from "@playwright/test"

const GRAY_900 = "rgb(23, 25, 35)"
const GRAY_800 = "rgb(26, 32, 44)"
const GRAY_50 = "rgb(247, 250, 252)"

async function backgroundOf(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor)
}

test.describe("with a dark OS preference", () => {
  test.use({ colorScheme: "dark" })

  test("starts dark on search, detail, and error pages", async ({ page }) => {
    await page.goto("/search")
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
    await expect(page.getByRole("heading", { name: "Search albums" })).toBeVisible()
    expect(await backgroundOf(page, "body")).toBe(GRAY_900)
    expect(await backgroundOf(page, "header")).toBe(GRAY_800)

    await page.goto("/search/1001?kind=release")
    await expect(page.getByRole("heading", { name: "Performers" })).toBeVisible()
    expect(await backgroundOf(page, "body")).toBe(GRAY_900)

    await page.goto("/search/777")
    await expect(
      page.getByRole("heading", { name: "Album details unavailable" })
    ).toBeVisible()
    expect(await backgroundOf(page, "body")).toBe(GRAY_900)

    await page.goto("/no-such-page")
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible()
    expect(await backgroundOf(page, "body")).toBe(GRAY_900)
  })

  test("lets a manual choice override the OS and returns to following it", async ({ page }) => {
    await page.goto("/search")
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")

    await page.getByRole("button", { name: "Color theme" }).click()
    await page.getByRole("menuitemradio", { name: "Light" }).click()
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
    expect(await backgroundOf(page, "body")).toBe(GRAY_50)

    await page.reload()
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light")

    await page.getByRole("button", { name: "Color theme" }).click()
    await page.getByRole("menuitemradio", { name: "System" }).click()
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")

    await page.emulateMedia({ colorScheme: "light" })
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  })
})

test("applies the stored mode before the app scripts load", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("discog-search:color-mode", "dark")
  })
  let releaseScripts = () => {}
  const scriptsGate = new Promise<void>((resolve) => {
    releaseScripts = resolve
  })
  await page.route("**/assets/*.js", async (route) => {
    await scriptsGate
    await route.continue()
  })

  await page.goto("/search", { waitUntil: "commit" })

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await expect(page.getByRole("heading", { name: "Search albums" })).toHaveCount(0)

  releaseScripts()
  await expect(page.getByRole("heading", { name: "Search albums" })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
})
