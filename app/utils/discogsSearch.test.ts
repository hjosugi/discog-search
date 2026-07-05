import { beforeEach, describe, expect, it, vi } from "vitest"

const discogsFetch = vi.hoisted(() => vi.fn())

vi.mock("./discogsAuthMiddleware", () => ({
  discogsFetch,
}))

import { searchDiscogsAlbums } from "./discogsSearch"

describe("searchDiscogsAlbums", () => {
  beforeEach(() => {
    discogsFetch.mockReset()
  })

  it("fetches cumulative pages up to the requested page", async () => {
    discogsFetch
      .mockResolvedValueOnce({
        pagination: { page: 1, pages: 3, items: 205, per_page: 100 },
        results: [{ id: 1, title: "Page 1", artist: "", thumb: "" }],
      })
      .mockResolvedValueOnce({
        pagination: { page: 2, pages: 3, items: 205, per_page: 100 },
        results: [{ id: 2, title: "Page 2", artist: "", thumb: "" }],
      })

    const response = await searchDiscogsAlbums({
      credit: "Tony Williams",
      song: "",
      genre: "",
      page: 2,
    })

    expect(response.results.map((result) => result.id)).toEqual([1, 2])
    expect(response.pagination).toMatchObject({
      page: 2,
      totalPages: 3,
      totalItems: 205,
      perPage: 100,
    })
    expect(discogsFetch).toHaveBeenNthCalledWith(
      1,
      "database/search",
      expect.objectContaining({ credit: "Tony Williams", page: 1 })
    )
    expect(discogsFetch).toHaveBeenNthCalledWith(
      2,
      "database/search",
      expect.objectContaining({ credit: "Tony Williams", page: 2 })
    )
  })

  it("passes exact year, country, and format filters to Discogs", async () => {
    discogsFetch.mockResolvedValueOnce({
      pagination: { page: 1, pages: 1, items: 1, per_page: 100 },
      results: [{ id: 1, title: "Filtered", artist: "", thumb: "" }],
    })

    await searchDiscogsAlbums({
      credit: "Herbie Hancock",
      song: "Watermelon Man",
      genre: "Jazz",
      year: "1973",
      country: "US",
      format: "LP",
      page: 1,
    })

    expect(discogsFetch).toHaveBeenCalledWith(
      "database/search",
      expect.objectContaining({
        credit: "Herbie Hancock",
        track: "Watermelon Man",
        genre: "Jazz",
        year: "1973",
        country: "US",
        format: "LP",
        type: "release",
      })
    )
  })
})
