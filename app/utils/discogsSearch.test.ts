import { beforeEach, describe, expect, it, vi } from "vitest"

import { searchDiscogsAlbums } from "./discogsSearch"
import type { DiscogsFetch } from "../server/discogs"

describe("searchDiscogsAlbums", () => {
  const discogsFetchMock = vi.fn()
  const discogsFetch: DiscogsFetch = <T = unknown>(
    endpoint: string,
    params?: Record<string, string | number | null | undefined>
  ) =>
    discogsFetchMock(endpoint, params) as Promise<T>

  beforeEach(() => {
    discogsFetchMock.mockReset()
  })

  it("fetches cumulative pages up to the requested page", async () => {
    discogsFetchMock
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
      discogsFetch
    )

    expect(response.results.map((result) => result.id)).toEqual([1, 2])
    expect(response.pagination).toMatchObject({
      page: 2,
      totalPages: 3,
      totalItems: 205,
      perPage: 100,
    })
    expect(discogsFetchMock).toHaveBeenNthCalledWith(
      1,
      "database/search",
      expect.objectContaining({ credit: "Tony Williams", page: 1 })
    )
    expect(discogsFetchMock).toHaveBeenNthCalledWith(
      2,
      "database/search",
      expect.objectContaining({ credit: "Tony Williams", page: 2 })
    )
  })

  it("passes exact year, country, and format filters to Discogs", async () => {
    discogsFetchMock.mockResolvedValueOnce({
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
      discogsFetch
    )

    expect(discogsFetchMock).toHaveBeenCalledWith(
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
