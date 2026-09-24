import type { SearchParam, SearchResult } from "../types"
import type { DiscogsApi } from "../server/discogs"
import { DiscogsRateLimitError } from "../server/discogs/errors"

export const SEARCH_RESULTS_PER_PAGE = 100
export const MAX_SEARCH_PAGES = 10

export type DiscogsSearchFilters = {
  credit: string
  song: string
  genre: string
  year?: string
  country?: string
  format?: string
  page?: number
}

export type DiscogsSearchPagination = {
  page: number
  totalPages: number
  totalItems: number
  perPage: number
  reachedPageLimit: boolean
}

export type DiscogsAlbumSearchResult = {
  results: SearchResult[]
  pagination: DiscogsSearchPagination
  /**
   * True when a later page hit the Discogs rate limit and the results only
   * contain the pages fetched before it. A rate limit on the first page is
   * thrown as `DiscogsRateLimitError` instead.
   */
  rateLimited?: boolean
}

type DiscogsSearch = DiscogsApi["search"]
type DiscogsSearchPage = Awaited<ReturnType<DiscogsSearch>>

export async function searchDiscogsAlbums({
  credit,
  song,
  genre,
  year = "",
  country = "",
  format = "",
  page = 1,
}: DiscogsSearchFilters, search: DiscogsSearch): Promise<DiscogsAlbumSearchResult> {
  const requestedPage = normalizeRequestedPage(page)
  const primaryParams = buildSearchParams({
    credit,
    song,
    genre,
    year,
    country,
    format,
    type: credit || song ? "release" : "master",
    useTrackSearch: Boolean(song),
  })
  const primary = await fetchSearchPages(
    primaryParams,
    requestedPage,
    search
  )

  if (primary.rateLimited || primary.results.length > 0 || !song) {
    return primary
  }

  return fetchSearchPages(
    buildSearchParams({
      credit,
      song,
      genre,
      year,
      country,
      format,
      type: credit || song ? "release" : "master",
      useTrackSearch: false,
    }),
    requestedPage,
    search
  )
}

function buildSearchParams({
  credit,
  song,
  genre,
  year,
  country,
  format,
  type,
  useTrackSearch,
}: DiscogsSearchFilters & {
  type: "master" | "release"
  useTrackSearch: boolean
}): SearchParam {
  return {
    q: song && !useTrackSearch ? song : null,
    credit: credit || null,
    track: song && useTrackSearch ? song : null,
    genre: genre || null,
    year: year || null,
    country: country || null,
    format: format || null,
    type,
    per_page: SEARCH_RESULTS_PER_PAGE,
    page: 1,
  }
}

async function fetchSearchPages(
  params: SearchParam,
  requestedPage: number,
  search: DiscogsSearch
): Promise<DiscogsAlbumSearchResult> {
  const targetPage = normalizeRequestedPage(requestedPage)
  let allResults: SearchResult[] = []
  let wasRateLimited = false
  let pagination: DiscogsSearchPagination = {
    page: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: params.per_page,
    reachedPageLimit: false,
  }
  let nextPage = 1

  while (nextPage <= targetPage) {
    let searchResults: DiscogsSearchPage
    try {
      searchResults = await search({ ...params, page: nextPage })
    } catch (error) {
      // Keep the pages that already loaded when a later page is rate limited.
      if (error instanceof DiscogsRateLimitError && nextPage > 1) {
        wasRateLimited = true
        break
      }
      throw error
    }
    allResults = allResults.concat(searchResults.results || [])
    pagination = normalizePagination(
      searchResults.pagination,
      nextPage,
      params.per_page,
      allResults.length
    )

    if (
      !searchResults.pagination ||
      searchResults.pagination.page >= searchResults.pagination.pages ||
      nextPage >= targetPage
    ) {
      break
    }

    nextPage = searchResults.pagination.page + 1
  }

  return {
    results: allResults,
    pagination: {
      ...pagination,
      reachedPageLimit:
        pagination.page >= MAX_SEARCH_PAGES &&
        pagination.page < pagination.totalPages,
    },
    rateLimited: wasRateLimited,
  }
}

function normalizeRequestedPage(page: number) {
  if (!Number.isFinite(page)) return 1
  return Math.min(Math.max(Math.floor(page), 1), MAX_SEARCH_PAGES)
}

function normalizePagination(
  pagination: DiscogsSearchPage["pagination"],
  fallbackPage: number,
  fallbackPerPage: number,
  fallbackItems: number
): DiscogsSearchPagination {
  const page = pagination?.page || fallbackPage
  const totalPages = pagination?.pages || page

  return {
    page,
    totalPages,
    totalItems: pagination?.items ?? fallbackItems,
    perPage: pagination?.per_page ?? fallbackPerPage,
    reachedPageLimit: false,
  }
}
