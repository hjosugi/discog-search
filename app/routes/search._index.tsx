import { useEffect, useState } from "react"
import { useFetcher, useLoaderData, useSearchParams } from "@remix-run/react"
import { discogsFetch } from "../utils/discogsAuthMiddleware"
import {
  Box,
  Input,
  Button,
  Spinner,
  Heading,
  VStack,
  Text,
} from "@chakra-ui/react"

import { ResultList } from "../components/ResultList"
import { SearchParam, SearchResult } from "../types"

type SuggestionData = {
  suggestions: SearchResult[]
}

type DiscogsSearchResponse = {
  results?: SearchResult[]
  pagination?: {
    page: number
    pages: number
  }
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)

  const q = (url.searchParams.get("q") || url.searchParams.get("artist") || "").trim()
  const artist = (url.searchParams.get("artist") || "").trim()
  const credit = (url.searchParams.get("credit") || "").trim()
  const genre = (url.searchParams.get("genre") || "").trim()

  if (!q && !artist && !credit && !genre) {
    return { results: [], isSearching: false }
  }

  const params: SearchParam = {
    q: q || null,
    credit: credit || null,
    genre: genre || null,
    type: "master",
    per_page: 100,
    page: 1,
  }
  let searchResults = (await discogsFetch(
    "database/search",
    params
  )) as DiscogsSearchResponse
  let allResults = searchResults.results || []

  const queryTokens = tokenize(q || artist)
  const MAX = artist || credit || genre || queryTokens.length > 2 ? 3 : 1
  while (
    searchResults.pagination &&
    searchResults.pagination.page < searchResults.pagination.pages &&
    searchResults.pagination.page < MAX
  ) {
    params.page = searchResults.pagination.page + 1
    searchResults = (await discogsFetch(
      "database/search",
      params
    )) as DiscogsSearchResponse
    allResults = allResults.concat(searchResults.results || [])
  }

  const results = rankSearchResults(allResults, {
    q,
    artist,
    genre,
  })

  return {
    results,
    isSearching: false,
  }
}

export default function SearchPage() {
  const {
    results,
    isSearching,
  }: { results: SearchResult[]; isSearching: boolean } = useLoaderData()
  const [searchParams] = useSearchParams()
  const suggestionsFetcher = useFetcher<SuggestionData>()

  const [q, setQ] = useState(
    () => searchParams.get("q") || searchParams.get("artist") || ""
  )
  const [credit, setCredit] = useState(() => searchParams.get("credit") || "")
  const [genre, setGenre] = useState(() => searchParams.get("genre") || "")
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false)

  const isSearchDisabled = !q && !credit && !genre
  const suggestions = suggestionsFetcher.data?.suggestions || []
  const showSuggestions =
    isSuggestionOpen && q.trim().length >= 2 && suggestions.length > 0

  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) return

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({ q: query })
      if (credit) params.set("credit", credit)
      if (genre) params.set("genre", genre)
      suggestionsFetcher.load(`/search/suggestions?${params.toString()}`)
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [credit, genre, q, suggestionsFetcher])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (q) params.append("q", q)
    if (credit) params.append("credit", credit)
    if (genre) params.append("genre", genre)
    window.location.search = params.toString()
  }

  const buildSuggestionHref = (suggestion: SearchResult) => {
    const params = new URLSearchParams()
    params.set("q", suggestion.title)
    if (credit) params.set("credit", credit)
    if (genre) params.set("genre", genre)
    return `/search/${suggestion.id}?${params.toString()}`
  }

  return (
    <Box p={{ base: 4, md: 6 }} maxW="760px" mx="auto">
      <Heading as="h1" size="md" mb={2}>
        Discogs Performer Search
      </Heading>
      <Text fontSize="sm" color="gray.600" mb={4}>
        Search loosely by track title and artist name together.
      </Text>

      <VStack as="form" onSubmit={handleSubmit} spacing={2} align="stretch">
        <Box position="relative">
          <Input
            placeholder="Track or artist name, e.g. Thriller Michael Jackson"
            value={q}
            onChange={(event) => {
              setQ(event.target.value)
              setIsSuggestionOpen(true)
            }}
            onFocus={() => setIsSuggestionOpen(true)}
            onBlur={() => setIsSuggestionOpen(false)}
            size="sm"
            autoComplete="off"
          />
          {showSuggestions && (
            <Box
              position="absolute"
              zIndex={10}
              top="calc(100% + 4px)"
              left={0}
              right={0}
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              boxShadow="md"
              overflow="hidden"
            >
              {suggestions.map((suggestion) => (
                <Box
                  key={suggestion.id}
                  as="a"
                  href={buildSuggestionHref(suggestion)}
                  display="block"
                  px={3}
                  py={2}
                  _hover={{ bg: "gray.50" }}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                    {suggestion.title}
                  </Text>
                  {suggestion.year && (
                    <Text fontSize="xs" color="gray.500">
                      {suggestion.year}
                    </Text>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
        <Input
          placeholder="Credit name, e.g. Drums, Bass, Guitar"
          value={credit}
          onChange={(event) => setCredit(event.target.value)}
          size="sm"
        />
        <Input
          placeholder="Genre"
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
          size="sm"
          list="genre-suggestions"
        />
        <datalist id="genre-suggestions">
          <option value="Jazz" />
          <option value="Rock" />
          <option value="Pop" />
          <option value="Classical" />
          <option value="Hip Hop" />
          <option value="Electronic" />
        </datalist>
        <Button
          colorScheme="blue"
          type="submit"
          isDisabled={isSearchDisabled}
          size="sm"
        >
          Search
        </Button>
      </VStack>

      <Box mt={4} maxH="400px" overflowY="auto">
        {isSearching ? (
          <Spinner size="md" mt={4} />
        ) : (
          <>
            {results.length > 0 && (
              <Text fontSize="sm" color="gray.600" mb={2}>
                {results.length} results
              </Text>
            )}
            <ResultList results={results} searchParams={{ q, credit, genre }} />
          </>
        )}
      </Box>
    </Box>
  )
}

function rankSearchResults(
  results: SearchResult[],
  filters: {
    q: string
    artist: string
    genre: string
  }
) {
  return dedupeResults(results)
    .map((result) => ({
      result,
      score: scoreResult(result, filters),
    }))
    .filter(({ score }) => score > -30)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return getYearValue(b.result.year) - getYearValue(a.result.year)
    })
    .map(({ result }) => result)
}

function dedupeResults(results: SearchResult[]) {
  const seen = new Set<string>()

  return results.filter((result) => {
    const key = [
      normalizeForSearch(result.title),
      result.year || "",
      result.country || "",
    ].join("|")

    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function scoreResult(
  result: SearchResult,
  filters: {
    q: string
    artist: string
    genre: string
  }
) {
  const normalizedTitle = normalizeForSearch(result.title)
  const normalizedQuery = normalizeForSearch(filters.q || filters.artist)
  const queryTokens = tokenize(filters.q || filters.artist)
  const genreTokens = tokenize(filters.genre)
  const metadata = normalizeForSearch(
    [
      result.artist,
      result.country,
      result.format?.join(" "),
      result.label?.join(" "),
      result.genre?.join(" "),
      result.style?.join(" "),
      result.catno,
    ]
      .filter(Boolean)
      .join(" ")
  )
  const searchableText = `${normalizedTitle} ${metadata}`.trim()
  let score = 0

  if (normalizedQuery) {
    if (normalizedTitle === normalizedQuery) score += 80
    if (normalizedTitle.includes(normalizedQuery)) score += 40
    if (normalizedTitle.startsWith(normalizedQuery)) score += 20

    const matchedTokens = queryTokens.filter((token) =>
      searchableText.includes(token)
    )
    score += matchedTokens.length * 12
    score -= (queryTokens.length - matchedTokens.length) * 18
  }

  if (genreTokens.length > 0) {
    const genreText = normalizeForSearch(
      [result.genre?.join(" "), result.style?.join(" ")].filter(Boolean).join(" ")
    )
    const matchedGenreTokens = genreTokens.filter((token) =>
      genreText.includes(token)
    )
    score += matchedGenreTokens.length * 18
    score -= (genreTokens.length - matchedGenreTokens.length) * 10
  }

  if (result.type === "master") score += 8
  if (result.thumb) score += 4
  if (result.year) score += 3
  if (result.format?.some((format) => /album|lp|cd/i.test(format))) score += 3
  if (/various artists/i.test(result.title)) score -= 12

  return score
}

function tokenize(value: string) {
  return normalizeForSearch(value)
    .split(" ")
    .filter((token) => token.length > 1)
}

function normalizeForSearch(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getYearValue(year?: string) {
  const value = Number(year)
  return Number.isFinite(value) ? value : 0
}
