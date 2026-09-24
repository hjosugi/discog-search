import { expect, test } from "@playwright/test"

test("saves favorites from results and details and opens them later", async ({ page }) => {
  await page.goto("/search?credit=Tony+Williams&song=Nefertiti")
  await expect(page.getByText("Miles Davis - Nefertiti")).toBeVisible()

  const saveFromList = page.getByRole("button", {
    name: "Save Miles Davis - Nefertiti to favorites",
  })
  await saveFromList.click()
  await expect(
    page.getByRole("button", { name: "Remove Miles Davis - Nefertiti from favorites" })
  ).toHaveAttribute("aria-pressed", "true")

  await page.getByRole("link", { name: /Favorites/ }).click()
  await expect(page).toHaveURL(/\/favorites$/)
  await expect(page.getByRole("heading", { name: "Favorites" })).toBeVisible()
  await expect(page.getByText("1 saved album")).toBeVisible()
  await expect(page.getByText("credit: Tony Williams · song: Nefertiti")).toBeVisible()

  await page.reload()
  await expect(page.getByText("1 saved album")).toBeVisible()

  await page.getByText("Miles Davis - Nefertiti").click()
  await expect(page).toHaveURL(/\/search\/1001\?credit=Tony\+Williams&song=Nefertiti&kind=release/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Miles Davis - Nefertiti" })
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Remove Miles Davis - Nefertiti from favorites" })
    .click()
  await expect(
    page.getByRole("button", { name: "Save Miles Davis - Nefertiti to favorites" })
  ).toHaveAttribute("aria-pressed", "false")

  await page.getByRole("link", { name: /Favorites/ }).click()
  await expect(page.getByRole("heading", { name: "No favorites yet" })).toBeVisible()
})

test("saves an album from its detail page", async ({ page }) => {
  await page.goto("/search/1001?kind=release&credit=Tony+Williams")
  await expect(
    page.getByRole("heading", { level: 1, name: "Miles Davis - Nefertiti" })
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Save Miles Davis - Nefertiti to favorites" })
    .click()
  await page.getByRole("link", { name: /Favorites/ }).click()

  await expect(page.getByText("1 saved album")).toBeVisible()
  await page
    .getByRole("button", { name: "Remove Miles Davis - Nefertiti from favorites" })
    .click()
  await expect(page.getByRole("heading", { name: "No favorites yet" })).toBeVisible()
})
