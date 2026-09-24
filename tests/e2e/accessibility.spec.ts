import { AxeBuilder } from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map(
        (node) => `${node.html.slice(0, 200)} :: ${node.failureSummary ?? ""}`
      ),
    }))
  ).toEqual([])
}

test("completes search, suggestion choice, and detail view with the keyboard", async ({ page }) => {
  await page.goto("/search")
  await expect(page.getByRole("heading", { name: "Search albums" })).toBeVisible()

  await page.keyboard.press("/")
  const credit = page.getByRole("textbox", { name: "Credit / performer" })
  await expect(credit).toBeFocused()
  await page.keyboard.type("Tony Williams")

  await page.keyboard.press("Tab")
  const song = page.getByRole("combobox", { name: "Song / track" })
  await expect(song).toBeFocused()
  await page.keyboard.type("Nefertiti")

  const listbox = page.getByRole("listbox", { name: "Track suggestions" })
  await expect(listbox).toBeVisible()
  await expect(song).toHaveAttribute("aria-expanded", "true")

  await page.keyboard.press("ArrowDown")
  const option = listbox.getByRole("option", { name: /Miles Davis - Nefertiti/ })
  await expect(option).toHaveAttribute("aria-selected", "true")
  await expect(song).toHaveAttribute(
    "aria-activedescendant",
    (await option.getAttribute("id")) || ""
  )

  await page.keyboard.press("Escape")
  await expect(listbox).toBeHidden()
  await expect(song).toHaveAttribute("aria-expanded", "false")

  await page.keyboard.press("ArrowDown")
  await expect(option).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("Enter")

  await expect(page).toHaveURL(/\/search\/1001\?.*kind=release/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Miles Davis - Nefertiti" })
  ).toBeVisible()
})

test("submits the search form with Enter when no suggestion is active", async ({ page }) => {
  await page.goto("/search")
  await page.getByRole("textbox", { name: "Credit / performer" }).fill("Tony Williams")
  await page.getByRole("textbox", { name: "Credit / performer" }).press("Enter")

  await expect(page).toHaveURL(/credit=Tony\+Williams/)
  await expect(page.getByText("1 albums")).toBeVisible()
})

test("exposes landmarks, a skip link, and non-color selection state", async ({ page }) => {
  await page.goto("/search/1001?kind=release&credit=Tony+Williams&role=Drums")

  await expect(page.getByRole("banner")).toBeVisible()
  await expect(page.getByRole("main")).toBeVisible()
  await expect(page.getByRole("contentinfo")).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible()

  await page.keyboard.press("Tab")
  const skipLink = page.getByRole("link", { name: "Skip to content" })
  await expect(skipLink).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("main")).toBeFocused()

  const tracks = page.locator('a[aria-current="true"]', { hasText: "Nefertiti" })
  await expect(tracks.first()).toBeVisible()
  await expect(
    page
      .getByRole("group", { name: "Filter performers by role" })
      .getByRole("link", { name: "Drums" })
  ).toHaveAttribute("aria-current", "true")
})

test("has no axe violations on the main pages in light mode", async ({ page }) => {
  await page.goto("/search?credit=Tony+Williams&song=Nefertiti")
  await expect(page.getByText("Miles Davis - Nefertiti")).toBeVisible()
  await expectNoAxeViolations(page)

  await page.goto("/search/1001?kind=release&credit=Tony+Williams&song=Nefertiti")
  await expect(page.getByRole("heading", { name: /Other versions \(3\)/ })).toBeVisible()
  await expectNoAxeViolations(page)

  await page.goto("/favorites")
  await expect(page.getByRole("heading", { name: "No favorites yet" })).toBeVisible()
  await expectNoAxeViolations(page)
})

test.describe("dark mode", () => {
  test.use({ colorScheme: "dark" })

  test("has no axe violations on the main pages", async ({ page }) => {
    await page.goto("/search?credit=Tony+Williams&song=Nefertiti")
    await expect(page.getByText("Miles Davis - Nefertiti")).toBeVisible()
    await expectNoAxeViolations(page)

    await page.goto("/search/1001?kind=release&credit=Tony+Williams&song=Nefertiti")
    await expect(page.getByRole("heading", { name: /Other versions \(3\)/ })).toBeVisible()
    await expectNoAxeViolations(page)
  })
})
