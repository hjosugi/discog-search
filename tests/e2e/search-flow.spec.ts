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
  await expect(page.getByRole("heading", { name: "Search albums" })).toBeVisible()
  await page.waitForLoadState("networkidle")
  const documentSearchRequests: string[] = []
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (request.resourceType() === "document" && url.pathname === "/search") {
      documentSearchRequests.push(request.url())
    }
  })

  await page
    .getByPlaceholder("Credit / performer, e.g. Tony Williams")
    .fill("Tony Williams")
  await page
    .getByPlaceholder("Song / track, e.g. Night in Tunisia")
    .fill("Nefertiti")
  await page.getByRole("button", { name: "Search" }).click()

  await expect(page).toHaveURL(/credit=Tony\+Williams/)
  expect(documentSearchRequests).toEqual([])
  await expect(page.getByText("1 albums")).toBeVisible()
  await expect(page.getByText("Miles Davis - Nefertiti")).toBeVisible()

  await page.getByText("Miles Davis - Nefertiti").click()

  await expect(
    page.getByRole("heading", { name: "Miles Davis - Nefertiti" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Nefertiti", exact: true })
  ).toBeVisible()
  await expect(page.getByRole("link", { name: "Tony Williams" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Drums" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Trumpet" })).toBeVisible()
  await expect(page.getByRole("link", { name: /^vocals$/i })).toHaveCount(0)

  await page.getByRole("link", { name: "Tony Williams" }).click()

  await expect(page).toHaveURL(/\/search\?credit=Tony\+Williams$/)
  await expect(page.getByText("1 albums")).toBeVisible()

  await page.goBack()

  await expect(
    page.getByRole("heading", { name: "Nefertiti", exact: true })
  ).toBeVisible()

  await page.getByRole("link", { name: "Trumpet" }).click()

  await expect(page).toHaveURL(/role=Trumpet/)
  await expect(page.getByRole("link", { name: "Miles Davis", exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Tony Williams" })).toHaveCount(0)
})

test("loads additional result pages and preserves list state", async ({ page }) => {
  await page.goto("/search")

  await page
    .getByPlaceholder("Credit / performer, e.g. Tony Williams")
    .fill("Large Search")
  await page.getByRole("button", { name: "Search" }).click()

  await expect(page.getByText("Showing 100 of 205 albums")).toBeVisible()
  await expect(page.getByRole("link", { name: "Load more" })).toBeVisible()

  await page.getByRole("link", { name: "Load more" }).click()

  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText("Showing 200 of 205 albums")).toBeVisible()
  await expect(page.getByText("Large Search Album 150")).toBeVisible()

  await page.getByText("Large Search Album 150").click()

  await expect(
    page.getByRole("heading", { level: 1, name: "Large Search Album 150" })
  ).toBeVisible()

  await page.getByRole("link", { name: "Back to List" }).click()

  await expect(page).toHaveURL(/credit=Large\+Search/)
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText("Showing 200 of 205 albums")).toBeVisible()
})

test("keeps filters and sort order in the URL", async ({ page }) => {
  await page.goto("/search")

  await page
    .getByPlaceholder("Credit / performer, e.g. Tony Williams")
    .fill("Filter Search")
  await page.getByRole("button", { name: "1970s" }).click()
  await page.getByLabel("Country").fill("US")
  await page.getByLabel("Format").selectOption("LP")
  await page.getByLabel("Sort").selectOption("year_asc")
  await page.getByRole("button", { name: "Search", exact: true }).click()

  await expect(page).toHaveURL(/decade=1970/)
  await expect(page).toHaveURL(/country=US/)
  await expect(page).toHaveURL(/format=LP/)
  await expect(page).toHaveURL(/sort=year_asc/)
  await expect(page.getByText("1971 Filter Search Album")).toBeVisible()
  await expect(page.getByText("1984 Filter Search Album")).toHaveCount(0)

  await page.getByLabel("Year").fill("1984")
  await page.getByLabel("Format").selectOption("CD")
  await page.getByRole("button", { name: "Search", exact: true }).click()

  await expect(page).toHaveURL(/year=1984/)
  expect(new URL(page.url()).searchParams.get("decade")).toBeNull()
  await expect(page.getByText("1984 Filter Search Album")).toBeVisible()

  await page.reload()

  await expect(page.getByLabel("Year")).toHaveValue("1984")
  await expect(page.getByLabel("Format")).toHaveValue("CD")
  await expect(page.getByLabel("Sort")).toHaveValue("year_asc")
})

test("saves recent searches and reruns a saved search", async ({ page }) => {
  await page.goto("/search")

  await page
    .getByPlaceholder("Credit / performer, e.g. Tony Williams")
    .fill("Tony Williams")
  await page
    .getByPlaceholder("Song / track, e.g. Night in Tunisia")
    .fill("Nefertiti")
  await page
    .getByPlaceholder("Instrument / role filter, e.g. drums")
    .fill("drums")
  await page.getByRole("button", { name: "Search" }).click()

  const tonyHistoryLink = page.getByRole("link", {
    name: /credit "Tony Williams".*song "Nefertiti".*role "drums"/,
  })

  await expect(tonyHistoryLink).toBeVisible()

  await page
    .getByPlaceholder("Credit / performer, e.g. Tony Williams")
    .fill("No Match")
  await page.getByRole("button", { name: "Search" }).click()
  await expect(
    page.getByRole("heading", {
      name: /No albums found for credit "No Match"/,
    })
  ).toBeVisible()

  await tonyHistoryLink.click()

  await expect(page).toHaveURL(/credit=Tony\+Williams/)
  await expect(page).toHaveURL(/song=Nefertiti/)
  await expect(page).toHaveURL(/role=drums/)
  await expect(page.getByText("Miles Davis - Nefertiti")).toBeVisible()

  await page
    .getByRole("button", { name: "Delete recent item 1" })
    .click()
  await expect(tonyHistoryLink).toHaveCount(0)

  await page.getByRole("button", { name: "Clear" }).click()
  await expect(page.getByText("Recent Searches")).toHaveCount(0)
})

test("restores submitted search state with browser back and forward", async ({ page }) => {
  await page.goto("/search")

  const creditInput = page.getByPlaceholder("Credit / performer, e.g. Tony Williams")

  await creditInput.fill("Tony Williams")
  await page.getByRole("button", { name: "Search" }).click()
  await expect(page.getByText("1 albums")).toBeVisible()
  await expect(creditInput).toHaveValue("Tony Williams")

  await creditInput.fill("No Match")
  await page.getByRole("button", { name: "Search" }).click()
  await expect(
    page.getByRole("heading", { name: 'No albums found for credit "No Match"' })
  ).toBeVisible()
  await expect(creditInput).toHaveValue("No Match")

  await page.goBack()
  await expect(page).toHaveURL(/credit=Tony\+Williams/)
  await expect(page.getByText("1 albums")).toBeVisible()
  await expect(creditInput).toHaveValue("Tony Williams")

  await page.goForward()
  await expect(page).toHaveURL(/credit=No\+Match/)
  await expect(
    page.getByRole("heading", { name: 'No albums found for credit "No Match"' })
  ).toBeVisible()
  await expect(creditInput).toHaveValue("No Match")
})

test("does not fetch suggestions while the suggestion panel is closed", async ({ page }) => {
  const suggestionRequests: string[] = []
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (url.pathname === "/search/suggestions") {
      suggestionRequests.push(request.url())
    }
  })

  await page.goto("/search")

  const songInput = page.getByPlaceholder("Song / track, e.g. Night in Tunisia")
  await songInput.fill("Nef")
  await songInput.blur()
  await page.waitForTimeout(800)

  expect(suggestionRequests).toEqual([])
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
