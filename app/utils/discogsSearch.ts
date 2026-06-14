import { SearchParam, SearchResult } from "../types"
import { discogsFetch } from "./discogsAuthMiddleware"

export type DiscogsSearchFilters = {
  credit: string
  song: string
  genre: string
}

export type DiscogsSearchResponse = {
  results: SearchResult[]
  rateLimited?: boolean
}

type DiscogsDatabaseSearchResponse = {
  results?: SearchResult[]
  pagination?: {
    page: number
    pages: number
  }
  rateLimited?: boolean
}

export async function searchDiscogsAlbums({
  credit,
  song,
  genre,
}: DiscogsSearchFilters): Promise<DiscogsSearchResponse> {
  const primaryParams = buildSearchParams({
    credit,
    song,
    genre,
    type: credit || song ? "release" : "master",
    useTrackSearch: Boolean(song),
  })
  const primary = await fetchSearchPages(primaryParams, credit || genre ? 2 : 1)

  if (primary.rateLimited || primary.results.length > 0 || !song) {
    return primary
  }

  return fetchSearchPages(
    buildSearchParams({
      credit,
      song,
      genre,
      type: credit || song ? "release" : "master",
      useTrackSearch: false,
    }),
    credit || genre ? 2 : 1
  )
}

function buildSearchParams({
  credit,
  song,
  genre,
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
    type,
    per_page: 100,
    page: 1,
  }
}

async function fetchSearchPages(
  params: SearchParam,
  maxPages: number
): Promise<DiscogsSearchResponse> {
  let searchResults = await discogsFetch<DiscogsDatabaseSearchResponse>(
    "database/search",
    params
  )
  let allResults = searchResults.results || []
  let wasRateLimited = Boolean(searchResults.rateLimited)

  while (
    !wasRateLimited &&
    searchResults.pagination &&
    searchResults.pagination.page < searchResults.pagination.pages &&
    searchResults.pagination.page < maxPages
  ) {
    params.page = searchResults.pagination.page + 1
    searchResults = await discogsFetch<DiscogsDatabaseSearchResponse>(
      "database/search",
      params
    )
    wasRateLimited = wasRateLimited || Boolean(searchResults.rateLimited)
    allResults = allResults.concat(searchResults.results || [])
  }

  return {
    results: allResults,
    rateLimited: wasRateLimited,
  }
}
