import type { SearchResult } from "../types"
import { api, toQueryObject } from "../utils/apiClient"

type SuggestionData = {
  suggestions: SearchResult[]
}

export async function clientLoader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const response = await api.api.suggestions.get({
    query: toQueryObject(url.searchParams),
  })

  if (response.error) {
    return emptySuggestions()
  }

  return response.data ?? emptySuggestions()
}

function emptySuggestions(): SuggestionData {
  return { suggestions: [] }
}
