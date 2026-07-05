import type { SearchResult } from "../types"
import { MAX_SEARCH_PAGES } from "./discogsSearch"
import type { SearchSortOption } from "./searchRanking"

export type SearchState = {
  credit: string
  song: string
  genre: string
  role: string
  year: string
  decade: string
  country: string
  format: string
  sort: SearchSortOption
  page: number
}

export const DEFAULT_PAGINATION = {
  page: 1,
  totalPages: 1,
  totalItems: 0,
  reachedPageLimit: false,
}

export const DECADE_OPTIONS = [
  "1940",
  "1950",
  "1960",
  "1970",
  "1980",
  "1990",
  "2000",
  "2010",
  "2020",
]

export function getSearchState(searchParams: URLSearchParams): SearchState {
  const year = getYearOption(searchParams.get("year"))

  return {
    credit: (
      searchParams.get("credit") ||
      searchParams.get("person") ||
      ""
    ).trim(),
    song: (
      searchParams.get("song") ||
      searchParams.get("q") ||
      searchParams.get("artist") ||
      ""
    ).trim(),
    genre: (searchParams.get("genre") || "").trim(),
    role: (searchParams.get("role") || "").trim(),
    year,
    decade: year ? "" : getDecadeOption(searchParams.get("decade")),
    country: (searchParams.get("country") || "").trim(),
    format: (searchParams.get("format") || "").trim(),
    sort: getSortOption(searchParams.get("sort")),
    page: getPageOption(searchParams.get("page")),
  }
}

export function getResultSearchParams(searchState: SearchState) {
  return Object.fromEntries(buildSearchParams(searchState)) as {
    [key: string]: string
  }
}

export function buildSearchParams(searchState: SearchState) {
  const params = new URLSearchParams()

  if (searchState.credit) params.set("credit", searchState.credit)
  if (searchState.song) params.set("song", searchState.song)
  if (searchState.genre) params.set("genre", searchState.genre)
  if (searchState.role) params.set("role", searchState.role)
  if (searchState.year) {
    params.set("year", searchState.year)
  } else if (searchState.decade) {
    params.set("decade", searchState.decade)
  }
  if (searchState.country) params.set("country", searchState.country)
  if (searchState.format) params.set("format", searchState.format)
  if (searchState.sort !== "relevance") params.set("sort", searchState.sort)
  if (searchState.page > 1) params.set("page", String(searchState.page))

  return params
}

export function formatSearchCriteria(searchState: SearchState) {
  const parts = [
    searchState.credit && `"${searchState.credit}" credits`,
    searchState.song && `"${searchState.song}" tracks`,
    searchState.genre && `${searchState.genre} albums`,
    searchState.year && searchState.year,
    searchState.decade && `${searchState.decade}s`,
    searchState.country && searchState.country,
    searchState.format && searchState.format,
    searchState.role && searchState.role,
  ].filter(Boolean)

  return parts.join(" / ")
}

export function filterResultsByDecade(
  results: SearchResult[],
  searchState: SearchState
) {
  if (!searchState.decade || searchState.year) return results

  const decadeStart = Number(searchState.decade)
  if (!Number.isFinite(decadeStart)) return results
  const decadeEnd = decadeStart + 9

  return results.filter((result) => {
    const year = Number(result.year)
    return Number.isFinite(year) && year >= decadeStart && year <= decadeEnd
  })
}

export function getPageOption(value: string | null) {
  const page = Number(value || 1)
  return Number.isFinite(page) && page > 0
    ? Math.min(Math.floor(page), MAX_SEARCH_PAGES)
    : 1
}

export function getSortOption(value: string | null): SearchSortOption {
  return value === "year_desc" || value === "year_asc" ? value : "relevance"
}

function getYearOption(value: string | null) {
  const year = (value || "").trim()
  return /^\d{4}$/.test(year) ? year : ""
}

function getDecadeOption(value: string | null) {
  const decade = (value || "").trim().replace(/s$/i, "")
  return DECADE_OPTIONS.includes(decade) ? decade : ""
}
