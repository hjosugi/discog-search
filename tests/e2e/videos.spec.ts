import { expect, test } from "@playwright/test"

test("plays YouTube videos inline only after pressing play", async ({ page }) => {
  const playerRequests: string[] = []
  await page.route(/youtube-nocookie\.com|i\.ytimg\.com/, (route) => {
    if (route.request().url().includes("youtube-nocookie.com")) {
      playerRequests.push(route.request().url())
    }
    return route.fulfill({ status: 204, body: "" })
  })

  await page.goto("/search/1001?kind=release&song=Nefertiti")
  await expect(page.getByRole("heading", { name: "Videos" })).toBeVisible()

  const playButton = page.getByRole("button", {
    name: "Play Miles Davis - Nefertiti (Official Audio)",
  })
  await expect(playButton).toBeVisible()
  await expect(playButton.locator("img")).toHaveAttribute(
    "src",
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  )
  await expect(page.locator("iframe")).toHaveCount(0)
  expect(playerRequests).toEqual([])

  await playButton.click()

  const player = page.locator("iframe")
  await expect(player).toHaveCount(1)
  await expect(player).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0"
  )
  await expect(player).toHaveAttribute(
    "title",
    "YouTube video player: Miles Davis - Nefertiti (Official Audio)"
  )

  await expect(
    page.getByRole("link", { name: /Nefertiti live footage/ })
  ).toHaveAttribute("href", "https://vimeo.com/123456")
})
