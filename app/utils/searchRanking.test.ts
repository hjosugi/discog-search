import { describe, expect, it } from "vitest"

import type { SearchResult } from "../types"
import { rankSearchResults } from "./searchRanking"

function result(overrides: Partial<SearchResult>): SearchResult {
  return {
    id: 1,
    title: "Untitled",
    artist: "Unknown Artist",
    thumb: "",
    ...overrides,
  }
}

describe("rankSearchResults", () => {
  it("deduplicates releases by normalized title, year, and country", () => {
    const ranked = rankSearchResults(
      [
        result({
          id: 1,
          title: "Miles Davis - Nefertiti",
          year: "1968",
          country: "US",
        }),
        result({
          id: 2,
          title: "Miles Davis – Nefertiti",
          year: "1968",
          country: "US",
        }),
        result({
          id: 3,
          title: "Miles Davis - Nefertiti",
          year: "1968",
          country: "JP",
        }),
      ],
      { credit: "", song: "", genre: "" }
    )

    expect(ranked.map((item) => item.id)).toEqual([1, 3])
  })

  it("promotes strong song title matches over weaker metadata matches", () => {
    const ranked = rankSearchResults(
      [
        result({
          id: 1,
          title: "Miles Davis - Studio Sessions",
          label: ["Includes Footprints"],
          year: "1967",
        }),
        result({
          id: 2,
          title: "Wayne Shorter - Footprints",
          year: "1966",
        }),
      ],
      { credit: "", song: "Footprints", genre: "" }
    )

    expect(ranked[0]?.id).toBe(2)
  })

  it("downranks likely leader releases for sideman searches", () => {
    const ranked = rankSearchResults(
      [
        result({
          id: 1,
          title: "Tony Williams - Emergency!",
          artist: "Tony Williams",
        }),
        result({
          id: 2,
          title: "Miles Davis - Nefertiti",
          artist: "Miles Davis, Tony Williams",
        }),
      ],
      { credit: "Tony Williams", song: "", genre: "" }
    )

    expect(ranked[0]?.id).toBe(2)
  })

  it("sorts matching results by newest year when requested", () => {
    const ranked = rankSearchResults(
      [
        result({ id: 1, title: "Album 1968", year: "1968" }),
        result({ id: 2, title: "Album 1972", year: "1972" }),
        result({ id: 3, title: "Album 1959", year: "1959" }),
      ],
      { credit: "", song: "", genre: "" },
      { sort: "year_desc" }
    )

    expect(ranked.map((item) => item.id)).toEqual([2, 1, 3])
  })

  it("sorts matching results by oldest year with undated results last", () => {
    const ranked = rankSearchResults(
      [
        result({ id: 1, title: "Album 1968", year: "1968" }),
        result({ id: 2, title: "Album without year" }),
        result({ id: 3, title: "Album 1959", year: "1959" }),
      ],
      { credit: "", song: "", genre: "" },
      { sort: "year_asc" }
    )

    expect(ranked.map((item) => item.id)).toEqual([3, 1, 2])
  })
})
