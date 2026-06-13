import { json } from "@remix-run/node"
import { discogsFetch } from "../utils/discogsAuthMiddleware"
import { SearchParam, SearchResult } from "../types"

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const q = url.searchParams.get("q")
  const credit = url.searchParams.get("credit")
  const genre = url.searchParams.get("genre")

  if (!q || q.trim().length < 2) {
    return json({ suggestions: [] })
  }

  const params: SearchParam = {
    q,
    credit,
    genre,
    type: "master",
    per_page: 8,
    page: 1,
  }

  try {
    const searchResults = await discogsFetch("database/search", params)
    const suggestions: SearchResult[] = (searchResults.results || []).slice(0, 8)
    return json({ suggestions })
  } catch (error) {
    console.error("Failed to fetch Discogs suggestions:", error)
    return json({ suggestions: [] })
  }
}
