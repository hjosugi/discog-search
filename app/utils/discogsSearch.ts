import { SearchParam, SearchResult } from "../types"
import { discogsFetch } from "./discogsAuthMiddleware"

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

export type DiscogsSearchResponse = {
  results: SearchResult[]
  pagination: DiscogsSearchPagination
  rateLimited?: boolean
}

type DiscogsDatabaseSearchResponse = {
  results?: SearchResult[]
  pagination?: {
    page: number
    pages: number
    items?: number
    per_page?: number
  }
  rateLimited?: boolean
}

export async function searchDiscogsAlbums({
  credit,
  song,
  genre,
  year = "",
  country = "",
  format = "",
  page = 1,
}: DiscogsSearchFilters): Promise<DiscogsSearchResponse> {
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
  const primary = await fetchSearchPages(primaryParams, requestedPage)

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
    requestedPage
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
  requestedPage: number
): Promise<DiscogsSearchResponse> {
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
    const searchResults = await discogsFetch<DiscogsDatabaseSearchResponse>(
      "database/search",
      { ...params, page: nextPage }
    )
    wasRateLimited = wasRateLimited || Boolean(searchResults.rateLimited)
    allResults = allResults.concat(searchResults.results || [])
    pagination = normalizePagination(
      searchResults.pagination,
      nextPage,
      params.per_page,
      allResults.length
    )

    if (
      wasRateLimited ||
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
  pagination: DiscogsDatabaseSearchResponse["pagination"],
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
