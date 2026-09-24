import { expect, test } from "@playwright/test"

test("switches the UI to Japanese and remembers the choice", async ({ page }) => {
  await page.goto("/search")
  await expect(page.getByRole("heading", { name: "Search albums" })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("lang", "en")

  await page.getByLabel("Language").selectOption("ja")

  await expect(page.getByRole("heading", { name: "アルバム検索" })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("lang", "ja")
  await expect(page.getByRole("link", { name: /お気に入り/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole("heading", { name: "アルバム検索" })).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("lang", "ja")

  await page
    .getByPlaceholder("クレジット / 演奏者 (例: Tony Williams)")
    .fill("Tony Williams")
  await page.getByRole("button", { name: "検索", exact: true }).click()
  await expect(page.getByText("1 件のアルバム")).toBeVisible()

  await page.getByText("Miles Davis - Nefertiti").click()
  await expect(page.getByRole("heading", { name: "演奏者" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "トラック" })).toBeVisible()
  await expect(page.getByRole("link", { name: "一覧に戻る" })).toBeVisible()

  await page.getByLabel("言語").selectOption("en")
  await expect(page.getByRole("heading", { name: "Performers" })).toBeVisible()
})

test.describe("with a Japanese browser", () => {
  test.use({ locale: "ja-JP" })

  test("starts in Japanese from Accept-Language", async ({ page }) => {
    await page.goto("/search")

    await expect(page.locator("html")).toHaveAttribute("lang", "ja")
    await expect(page.getByRole("heading", { name: "アルバム検索" })).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "クレジット・曲名・ジャンルのどれかから検索" })
    ).toBeVisible()
  })

  test("shows Discogs errors in Japanese", async ({ page }) => {
    await page.goto("/search/777")

    await expect(
      page.getByRole("heading", { name: "アルバム詳細を表示できません" })
    ).toBeVisible()
    await expect(
      page.getByText("この Discogs アイテムは見つかりませんでした。")
    ).toBeVisible()
  })
})
