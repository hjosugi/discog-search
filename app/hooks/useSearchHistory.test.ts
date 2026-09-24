import { describe, expect, it } from "vitest"

import { createTranslator } from "../i18n/locale"
import {
  addSearchHistoryEntry,
  buildSearchHistoryHref,
  buildSearchHistorySummary,
  type SearchHistoryEntry,
  type SearchHistoryInput,
} from "./useSearchHistory"

const baseSearch: SearchHistoryInput = {
  credit: "Tony Williams",
  song: "Nefertiti",
  genre: "Jazz",
  role: "drums",
  year: "",
  decade: "1960",
  country: "US",
  format: "LP",
  sort: "year_desc",
}

describe("search history helpers", () => {
  it("moves duplicate searches to the front", () => {
    const first = addSearchHistoryEntry([], baseSearch, 1)
    const second = addSearchHistoryEntry(
      first,
      { ...baseSearch, credit: "Herbie Hancock", song: "Maiden Voyage" },
      2
    )
    const third = addSearchHistoryEntry(second, baseSearch, 3)

    expect(third).toHaveLength(2)
    expect(third[0]).toMatchObject({ credit: "Tony Williams", createdAt: 3 })
    expect(third[1]).toMatchObject({ credit: "Herbie Hancock", createdAt: 2 })
  })

  it("keeps only the 10 most recent searches", () => {
    let entries: SearchHistoryEntry[] = []

    Array.from({ length: 12 }).forEach((_, index) => {
      entries = addSearchHistoryEntry(
        entries,
        { ...baseSearch, credit: `Artist ${index}` },
        index
      )
    })

    expect(entries).toHaveLength(10)
    expect(entries[0].credit).toBe("Artist 11")
    expect(entries[9].credit).toBe("Artist 2")
  })

  it("builds a rerunnable URL without page state", () => {
    expect(buildSearchHistoryHref(baseSearch)).toBe(
      "/search?credit=Tony+Williams&song=Nefertiti&genre=Jazz&role=drums&decade=1960&country=US&format=LP&sort=year_desc"
    )
  })

  it("summarizes saved criteria", () => {
    expect(buildSearchHistorySummary(baseSearch)).toBe(
      'credit "Tony Williams" / song "Nefertiti" / genre "Jazz" / role "drums" / 1960s / US / LP'
    )
  })

  it("summarizes saved criteria in Japanese", () => {
    expect(buildSearchHistorySummary(baseSearch, createTranslator("ja"))).toBe(
      "クレジット「Tony Williams」 / 曲名「Nefertiti」 / ジャンル「Jazz」 / 担当「drums」 / 1960年代 / US / LP"
    )
  })
})
