import {
  DiscogsFetchError,
  discogsFetch,
} from "../utils/discogsAuthMiddleware"
import { SearchParam, SearchResult } from "../types"

type SuggestionData = {
  suggestions: SearchResult[]
}

type DiscogsSearchResponse = {
  results?: SearchResult[]
  rateLimited?: boolean
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const song = (url.searchParams.get("song") || url.searchParams.get("q") || "").trim()
  const credit = (
    url.searchParams.get("credit") ||
    url.searchParams.get("person") ||
    ""
  ).trim()
  const genre = (url.searchParams.get("genre") || "").trim()

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
    const searchResults = await discogsFetch<DiscogsSearchResponse>(
      "database/search",
      params
    )
    if (searchResults.rateLimited) {
      return emptySuggestions()
    }

    const suggestions: SearchResult[] = (searchResults.results || []).slice(0, 5)
    return { suggestions }
  } catch (error) {
    if (!isExpectedDiscogsSuggestionError(error)) {
      console.error("Failed to fetch Discogs suggestions:", error)
    }
    return emptySuggestions()
  }
}

function emptySuggestions(): SuggestionData {
  return { suggestions: [] }
}

function isExpectedDiscogsSuggestionError(error: unknown) {
  return (
    error instanceof DiscogsFetchError &&
    (error.status === 401 || error.status === 403 || error.status === 429)
  )
}
