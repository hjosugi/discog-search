import type {
  DiscogsMaster,
  DiscogsRelease,
  MasterVersion,
  SearchParam,
  SearchResult,
} from "../types"
import type { DiscogsApi } from "./discogs"
import {
  DiscogsFetchError,
  DiscogsRateLimitError,
  DiscogsResponseError,
} from "./discogs/errors"
import { searchDiscogsAlbums } from "../utils/discogsSearch"
import {
  DEFAULT_PAGINATION,
  filterResultsByDecade,
  getSearchState,
} from "../utils/searchState"
import { rankSearchResults } from "../utils/searchRanking"
import { findBestTrackMatch } from "../utils/trackCredits"

export type SearchApiData = {
  results: SearchResult[]
  pagination: {
    page: number
    totalPages: number
    totalItems: number
    reachedPageLimit: boolean
  }
  errorMessage?: string
  errorCode?: ApiErrorCode
}

export type SuggestionApiData = {
  suggestions: SearchResult[]
}

export type ReleaseApiData = {
  master: DiscogsMaster
  release: DiscogsRelease
  selectedTrackPosition: string | null
  searchQuery: string
  roleFilter: string
  backQuery: string
  detailId: string
  detailKind: "master" | "release"
}

export type MasterVersionsApiData = {
  masterId: string
  versions: MasterVersion[]
  pagination: {
    page: number
    totalPages: number
    totalItems: number
  }
}

export const MASTER_VERSIONS_PER_PAGE = 100

/**
 * Stable machine-readable error codes returned next to the English message,
 * so the UI can show its own localized text.
 */
export type ApiErrorCode =
  | "discogs_auth"
  | "discogs_rate_limited"
  | "discogs_not_found"
  | "discogs_bad_response"
  | "discogs_error"
  | "bad_request"
  | "internal"

export class ApiHttpError extends Error {
  status: number
  code: ApiErrorCode

  constructor(message: string, status: number, code: ApiErrorCode) {
    super(message)
    this.name = "ApiHttpError"
    this.status = status
    this.code = code
  }
}

export async function getSearchApiData(
  searchParams: URLSearchParams,
  discogs: DiscogsApi
): Promise<SearchApiData> {
  const searchState = getSearchState(searchParams)
  const { credit, song, genre, year, country, format, sort, page } = searchState

  if (!credit && !song && !genre) {
    return { results: [], pagination: DEFAULT_PAGINATION }
  }

  try {
    const searchResults = await searchDiscogsAlbums(
      {
        credit,
        song,
        genre,
        year,
        country,
        format,
        page,
      },
      discogs.search
    )
    const results = rankSearchResults(
      filterResultsByDecade(searchResults.results, searchState),
      {
        credit,
        song,
        genre,
      },
      { sort }
    )

    if (searchResults.rateLimited) {
      const partialError = toApiError(new DiscogsRateLimitError(Date.now()))
      return {
        results,
        pagination: searchResults.pagination,
        errorMessage: partialError.message,
        errorCode: partialError.code,
      }
    }

    return { results, pagination: searchResults.pagination }
  } catch (error) {
    const apiError = toApiError(error, "search")

    return {
      results: [],
      pagination: DEFAULT_PAGINATION,
      errorMessage: apiError.message,
      errorCode: apiError.code,
    }
  }
}

export async function getSuggestionsApiData(
  searchParams: URLSearchParams,
  discogs: DiscogsApi
): Promise<SuggestionApiData> {
  const song = (searchParams.get("song") || searchParams.get("q") || "").trim()
  const credit = (
    searchParams.get("credit") ||
    searchParams.get("person") ||
    ""
  ).trim()
  const genre = (searchParams.get("genre") || "").trim()

  if (song.length < 3) {
    return emptySuggestions()
  }

  const params: SearchParam = {
    q: null,
    credit: credit || null,
    track: song || null,
    genre: genre || null,
    type: "release",
    per_page: 5,
    page: 1,
  }

  try {
    const searchResults = await discogs.search(params)
    return { suggestions: (searchResults.results || []).slice(0, 5) }
  } catch (error) {
    // Suggestions are best-effort: log unexpected failures, show nothing.
    toApiError(error, "suggestions")
    return emptySuggestions()
  }
}

export async function getReleaseApiData({
  id,
  searchParams,
  discogs,
}: {
  id: string
  searchParams: URLSearchParams
  discogs: DiscogsApi
}): Promise<ReleaseApiData> {
  const resultKind = searchParams.get("kind") === "release" ? "release" : "master"
  const requestedTrack = searchParams.get("track")
  const searchQuery = searchParams.get("song") || searchParams.get("q") || ""
  const roleFilter = searchParams.get("role") || ""

  if (!id) {
    throw new ApiHttpError("Album ID is required", 400, "bad_request")
  }

  try {
    const release =
      resultKind === "release" ? await discogs.getRelease(id) : null
    const master: DiscogsMaster = release
      ? release.master_id
        ? await discogs.getMaster(release.master_id)
        : release
      : await discogs.getMaster(id)
    const resolvedRelease: DiscogsRelease =
      release ||
      (master.main_release
        ? await discogs.getRelease(master.main_release)
        : master)
    const selectedTrackPosition =
      requestedTrack ||
      findBestTrackMatch(resolvedRelease.tracklist || master.tracklist || [], searchQuery)
        ?.position ||
      null

    return {
      master,
      release: resolvedRelease,
      selectedTrackPosition,
      searchQuery,
      roleFilter,
      backQuery: searchParams.toString(),
      detailId: id,
      detailKind: resultKind,
    }
  } catch (error) {
    throw toApiError(error, "album")
  }
}

export async function getMasterVersionsApiData({
  id,
  page,
  discogs,
}: {
  id: string
  page: number
  discogs: DiscogsApi
}): Promise<MasterVersionsApiData> {
  try {
    const response = await discogs.getMasterVersions(id, {
      page,
      perPage: MASTER_VERSIONS_PER_PAGE,
    })
    const versions = response.versions || []

    return {
      masterId: id,
      versions,
      pagination: {
        page: response.pagination?.page ?? page,
        totalPages: response.pagination?.pages ?? page,
        totalItems: response.pagination?.items ?? versions.length,
      },
    }
  } catch (error) {
    throw toApiError(error, "album")
  }
}

function emptySuggestions(): SuggestionApiData {
  return { suggestions: [] }
}

type ErrorContext = "search" | "suggestions" | "album"

/**
 * The single place that turns Discogs failures into API errors: it picks the
 * HTTP status, the error code, and the user-facing message, and logs only the
 * failures that are not an expected Discogs condition.
 */
export function toApiError(
  error: unknown,
  context: ErrorContext = "search"
): ApiHttpError {
  if (error instanceof ApiHttpError) return error

  if (error instanceof DiscogsRateLimitError) {
    return new ApiHttpError(
      context === "album"
        ? "Discogs rate limit was reached. Please wait a moment and try again."
        : "Discogs rate limit was reached. Please wait a moment and search again.",
      429,
      "discogs_rate_limited"
    )
  }

  if (error instanceof DiscogsResponseError) {
    console.error(`Unexpected Discogs payload (${context}):`, error.message)
    return new ApiHttpError(
      "Discogs returned data in an unexpected format.",
      502,
      "discogs_bad_response"
    )
  }

  if (error instanceof DiscogsFetchError) {
    if (error.status === 401 || error.status === 403) {
      return new ApiHttpError(
        "Discogs rejected the request. Check DISCOGS_TOKEN, or DISCOGS_API_KEY and DISCOGS_API_SECRET, then restart the dev server.",
        error.status,
        "discogs_auth"
      )
    }
    if (error.status === 404 && context === "album") {
      return new ApiHttpError(
        "This Discogs item could not be found.",
        404,
        "discogs_not_found"
      )
    }

    console.error(`Discogs request failed (${context}):`, error)
    return new ApiHttpError(
      context === "album" ? "Failed to fetch album data." : error.message,
      error.status >= 400 && error.status < 600 ? error.status : 502,
      "discogs_error"
    )
  }

  console.error(`Failed to load Discogs data (${context}):`, error)
  return new ApiHttpError(
    context === "album"
      ? "Failed to fetch album data."
      : "Could not fetch Discogs search results. Please try again.",
    500,
    "internal"
  )
}
