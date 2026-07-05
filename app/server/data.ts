import type {
  DiscogsMaster,
  DiscogsRelease,
  SearchParam,
  SearchResult,
} from "../types"
import type { DiscogsClient } from "./discogs"
import { DiscogsFetchError } from "./discogs"
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

type RateLimitedResponse = {
  rateLimited?: boolean
}

export class ApiHttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiHttpError"
    this.status = status
  }
}

export async function getSearchApiData(
  searchParams: URLSearchParams,
  discogs: DiscogsClient
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
      discogs.fetch
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

    return {
      results,
      pagination: searchResults.pagination,
      errorMessage: searchResults.rateLimited
        ? "Discogs is cooling down after rate limiting. Cached results will be used when available."
        : undefined,
    }
  } catch (error) {
    if (!isExpectedDiscogsSearchError(error)) {
      console.error("Failed to fetch Discogs search results:", error)
    }

    return {
      results: [],
      pagination: DEFAULT_PAGINATION,
      errorMessage: getSearchErrorMessage(error),
    }
  }
}

export async function getSuggestionsApiData(
  searchParams: URLSearchParams,
  discogs: DiscogsClient
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
    const searchResults = await discogs.fetch<{
      results?: SearchResult[]
      rateLimited?: boolean
    }>("database/search", params)
    if (searchResults.rateLimited) {
      return emptySuggestions()
    }

    return { suggestions: (searchResults.results || []).slice(0, 5) }
  } catch (error) {
    if (!isExpectedDiscogsSuggestionError(error)) {
      console.error("Failed to fetch Discogs suggestions:", error)
    }
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
  discogs: DiscogsClient
}): Promise<ReleaseApiData> {
  const resultKind = searchParams.get("kind") === "release" ? "release" : "master"
  const requestedTrack = searchParams.get("track")
  const searchQuery = searchParams.get("song") || searchParams.get("q") || ""
  const roleFilter = searchParams.get("role") || ""

  if (!id) {
    throw new ApiHttpError("Album ID is required", 400)
  }

  try {
    const release =
      resultKind === "release" ? await fetchDiscogsRelease(id, discogs) : null
    const master = release
      ? release.master_id
        ? await fetchDiscogsMaster(release.master_id, discogs)
        : (release as DiscogsMaster)
      : await fetchDiscogsMaster(id, discogs)
    const resolvedRelease =
      release ||
      (master.main_release
        ? await fetchDiscogsRelease(master.main_release, discogs)
        : (master as DiscogsRelease))
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
    if (error instanceof ApiHttpError) {
      throw error
    }
    if (error instanceof DiscogsFetchError) {
      if (!isExpectedDiscogsAlbumError(error)) {
        console.error("Failed to fetch album data:", error)
      }
      throw new ApiHttpError(getAlbumErrorMessage(error), error.status)
    }

    console.error("Failed to fetch album data:", error)
    throw new ApiHttpError("Failed to fetch album data", 500)
  }
}

async function fetchDiscogsMaster(id: string | number, discogs: DiscogsClient) {
  const response = await discogs.fetch<DiscogsMaster | RateLimitedResponse>(
    `masters/${id}`
  )
  if (isRateLimitedResponse(response)) {
    throw new ApiHttpError("Discogs is cooling down after rate limiting.", 429)
  }
  return response
}

async function fetchDiscogsRelease(id: string | number, discogs: DiscogsClient) {
  const response = await discogs.fetch<DiscogsRelease | RateLimitedResponse>(
    `releases/${id}`
  )
  if (isRateLimitedResponse(response)) {
    throw new ApiHttpError("Discogs is cooling down after rate limiting.", 429)
  }
  return response
}

function emptySuggestions(): SuggestionApiData {
  return { suggestions: [] }
}

function isRateLimitedResponse(
  response: DiscogsMaster | DiscogsRelease | RateLimitedResponse
): response is RateLimitedResponse {
  return Boolean("rateLimited" in response && response.rateLimited)
}

function getSearchErrorMessage(error: unknown) {
  if (error instanceof DiscogsFetchError) {
    if (error.status === 401 || error.status === 403) {
      return "Discogs rejected the request. Check DISCOGS_TOKEN, or DISCOGS_API_KEY and DISCOGS_API_SECRET, then restart the dev server."
    }
    if (error.status === 429) {
      return "Discogs rate limit was reached. Please wait a moment and search again."
    }
    return error.message
  }

  return "Could not fetch Discogs search results. Please try again."
}

function isExpectedDiscogsSearchError(error: unknown) {
  return (
    error instanceof DiscogsFetchError &&
    (error.status === 401 || error.status === 403 || error.status === 429)
  )
}

function isExpectedDiscogsSuggestionError(error: unknown) {
  return (
    error instanceof DiscogsFetchError &&
    (error.status === 401 || error.status === 403 || error.status === 429)
  )
}

function isExpectedDiscogsAlbumError(error: DiscogsFetchError) {
  return (
    error.status === 401 ||
    error.status === 403 ||
    error.status === 404 ||
    error.status === 429
  )
}

function getAlbumErrorMessage(error: DiscogsFetchError) {
  if (error.status === 401 || error.status === 403) {
    return "Discogs rejected the request. Check DISCOGS_TOKEN, then restart the dev server."
  }
  if (error.status === 404) {
    return "This Discogs item could not be found."
  }
  if (error.status === 429) {
    return "Discogs rate limit was reached. Please wait a moment and try again."
  }
  return "Failed to fetch album data."
}
