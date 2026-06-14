import { json } from "@remix-run/node"
import {
  DiscogsFetchError,
  discogsFetch,
} from "../utils/discogsAuthMiddleware"
import { SearchParam, SearchResult } from "../types"

type DiscogsSearchResponse = {
  results?: SearchResult[]
  rateLimited?: boolean
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const q = (url.searchParams.get("q") || "").trim()
  const credit = (url.searchParams.get("credit") || "").trim()
  const genre = (url.searchParams.get("genre") || "").trim()

  if (q.length < 3) {
    return json({ suggestions: [] })
  }

  const params: SearchParam = {
    q,
    credit: credit || null,
    genre: genre || null,
    type: "master",
    per_page: 5,
    page: 1,
  }

  try {
    const searchResults = await discogsFetch<DiscogsSearchResponse>(
      "database/search",
      params
    )
    if (searchResults.rateLimited) {
      return json({ suggestions: [] })
    }

    const suggestions: SearchResult[] = (searchResults.results || []).slice(0, 5)
    return json({ suggestions })
  } catch (error) {
    if (!isExpectedDiscogsSuggestionError(error)) {
      console.error("Failed to fetch Discogs suggestions:", error)
    }
    return json({ suggestions: [] })
  }
}

function isExpectedDiscogsSuggestionError(error: unknown) {
  return (
    error instanceof DiscogsFetchError &&
    (error.status === 401 || error.status === 403 || error.status === 429)
  )
}
