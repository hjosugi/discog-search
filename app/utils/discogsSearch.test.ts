import { beforeEach, describe, expect, it, vi } from "vitest"

import { searchDiscogsAlbums } from "./discogsSearch"
import type { DiscogsApi } from "../server/discogs"
import { DiscogsRateLimitError } from "../server/discogs/errors"

describe("searchDiscogsAlbums", () => {
  const searchMock = vi.fn()
  const search: DiscogsApi["search"] = (params) => searchMock(params)

  beforeEach(() => {
    searchMock.mockReset()
  })

  it("fetches cumulative pages up to the requested page", async () => {
    searchMock
      .mockResolvedValueOnce({
        pagination: { page: 1, pages: 3, items: 205, per_page: 100 },
        results: [{ id: 1, title: "Page 1", artist: "", thumb: "" }],
      })
      .mockResolvedValueOnce({
        pagination: { page: 2, pages: 3, items: 205, per_page: 100 },
        results: [{ id: 2, title: "Page 2", artist: "", thumb: "" }],
      })

    const response = await searchDiscogsAlbums(
      {
        credit: "Tony Williams",
        song: "",
        genre: "",
        page: 2,
      },
      search
    )

    expect(response.results.map((result) => result.id)).toEqual([1, 2])
    expect(response.pagination).toMatchObject({
      page: 2,
      totalPages: 3,
      totalItems: 205,
      perPage: 100,
    })
    expect(searchMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ credit: "Tony Williams", page: 1 })
    )
    expect(searchMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ credit: "Tony Williams", page: 2 })
    )
  })

  it("passes exact year, country, and format filters to Discogs", async () => {
    searchMock.mockResolvedValueOnce({
      pagination: { page: 1, pages: 1, items: 1, per_page: 100 },
      results: [{ id: 1, title: "Filtered", artist: "", thumb: "" }],
    })

    await searchDiscogsAlbums(
      {
        credit: "Herbie Hancock",
        song: "Watermelon Man",
        genre: "Jazz",
        year: "1973",
        country: "US",
        format: "LP",
        page: 1,
      },
      search
    )

    expect(searchMock).toHaveBeenCalledWith(
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

  it("keeps loaded pages when a later page is rate limited", async () => {
    searchMock
      .mockResolvedValueOnce({
        pagination: { page: 1, pages: 3, items: 205, per_page: 100 },
        results: [{ id: 1, title: "Page 1" }],
      })
      .mockRejectedValueOnce(new DiscogsRateLimitError(Date.now() + 1000))

    const response = await searchDiscogsAlbums(
      { credit: "Tony Williams", song: "", genre: "", page: 2 },
      search
    )

    expect(response.rateLimited).toBe(true)
    expect(response.results.map((result) => result.id)).toEqual([1])
  })

  it("rethrows a rate limit on the first page", async () => {
    searchMock.mockRejectedValueOnce(new DiscogsRateLimitError(Date.now() + 1000))

    await expect(
      searchDiscogsAlbums(
        { credit: "Tony Williams", song: "", genre: "", page: 1 },
        search
      )
    ).rejects.toBeInstanceOf(DiscogsRateLimitError)
  })
})
