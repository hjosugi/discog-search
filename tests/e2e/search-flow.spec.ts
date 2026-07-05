import { expect, test } from "@playwright/test"

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
