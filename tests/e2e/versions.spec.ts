import { expect, test } from "@playwright/test"

test("lists other versions of the master and switches to one", async ({ page }) => {
  await page.goto("/search/1001?kind=release&credit=Tony+Williams&song=Nefertiti&track=A2")

  const versions = page.getByRole("region", { name: /Other versions/ })
  await expect(versions.getByRole("heading", { name: "Other versions (3)" })).toBeVisible()
  await expect(versions.getByRole("listitem")).toHaveCount(3)

  const current = versions.getByRole("link", { name: /1968 · US/ })
  await expect(current).toHaveAttribute("aria-current", "page")
  await expect(current).toContainText("Current")
  await expect(versions.getByText("CBS/Sony 32DP 717")).toBeVisible()

  await versions.getByRole("link", { name: /1986 · Japan/ }).click()

  await expect(page).toHaveURL(/\/search\/1002\?/)
  const url = new URL(page.url())
  expect(url.searchParams.get("kind")).toBe("release")
  expect(url.searchParams.get("credit")).toBe("Tony Williams")
  expect(url.searchParams.get("song")).toBe("Nefertiti")
  expect(url.searchParams.has("track")).toBe(false)
  await expect(page.getByRole("link", { name: "Ron Carter" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Tony Williams" })).toHaveCount(0)
  await expect(
    versions.getByRole("link", { name: /1986 · Japan/ })
  ).toHaveAttribute("aria-current", "page")
})
