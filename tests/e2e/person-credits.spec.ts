import { expect, test } from "@playwright/test"

test("shows where the searched person plays and switches tracks from it", async ({ page }) => {
  await page.goto("/search/1001?kind=release&credit=Tony+Williams&song=Nefertiti")

  const panel = page.getByRole("region", { name: "Tony Williams on this album" })
  await expect(panel).toBeVisible()
  await expect(panel.getByText("Credited on 2 of 3 tracks")).toBeVisible()
  await expect(panel.getByRole("listitem")).toHaveCount(2)

  const firstRow = panel.getByRole("link", { name: /A1\s*Nefertiti\s*Drums/ })
  await expect(firstRow).toHaveAttribute("aria-current", "true")

  await panel.getByRole("link", { name: /A2\s*Fall\s*Drums/ }).click()

  await expect(page).toHaveURL(/track=A2/)
  await expect(page.getByRole("heading", { level: 2, name: "Fall" })).toBeVisible()
  await expect(
    panel.getByRole("link", { name: /A2\s*Fall\s*Drums/ })
  ).toHaveAttribute("aria-current", "true")
})

test("explains when the searched person is not credited on the release", async ({ page }) => {
  await page.goto("/search/1001?kind=release&credit=Ron+Carter")

  await expect(
    page.getByRole("region", { name: "Ron Carter on this album" })
  ).toContainText("No credits for Ron Carter were found on this release.")
})
