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

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)

  const q = url.searchParams.get("q") || url.searchParams.get("artist")
  const artist = url.searchParams.get("artist")
  const credit = url.searchParams.get("credit")
  const genre = url.searchParams.get("genre")

  if (!q && !artist && !credit && !genre) {
    return { results: [], isSearching: false }
  }

  const params: SearchParam = {
<<<<<<< HEAD
    q,
    credit,
    genre,
||||||| e3e4796
    q: q || artist || credit,
=======
    q: q || undefined,
    artist: artist || undefined,
    credit: credit || undefined,
    genre: genre || undefined,
>>>>>>> origin/codex/add-musician-information-feature
    type: "master",
    per_page: 100,
    page: 1,
  }
  let searchResults = await discogsFetch("database/search", params)
  let allResults = searchResults.results

<<<<<<< HEAD
  const MAX = artist || credit ? 3 : 1
||||||| e3e4796
  let MAX = artist ? 3 : 1
=======
  const MAX = artist ? 3 : 1
>>>>>>> origin/codex/add-musician-information-feature
  while (
    searchResults.pagination &&
    searchResults.pagination.page < searchResults.pagination.pages &&
    searchResults.pagination.page < MAX
  ) {
    params.page = searchResults.pagination.page + 1
    searchResults = await discogsFetch("database/search", params)
    allResults = allResults.concat(searchResults.results)
  }

  const results: SearchResult[] = allResults
    .filter((r: SearchResult) => {
      if (artist) {
        return r.title.toLowerCase().includes(artist.toLowerCase())
      }
      return true
    })
    .sort((a: SearchResult, b: SearchResult) => {
      if (artist) {
        const artistA = a.title.toUpperCase()
        const artistB = b.title.toUpperCase()
        if (artistA < artistB) {
          return -1
        }
        if (artistA > artistB) {
          return 1
        }
        return 0
      }
      return 0
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
  const [credit, setcredit] = useState(() => searchParams.get("credit") || "")
  const [genre, setGenre] = useState(() => searchParams.get("genre") || "")
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false)

<<<<<<< HEAD
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
||||||| e3e4796
  const isSearchDisabled = !q && !artist && !credit
=======
  const isSearchDisabled = !q && !artist && !credit && !genre
>>>>>>> origin/codex/add-musician-information-feature

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
        Discogs 演奏者検索
      </Heading>
      <Text fontSize="sm" color="gray.600" mb={4}>
        曲名とアーティスト名をまとめて、あいまいに検索できます。
      </Text>

      <VStack as="form" onSubmit={handleSubmit} spacing={2} align="stretch">
        <Box position="relative">
          <Input
            placeholder="曲名・アーティスト名（例: Thriller Michael Jackson）"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
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
          placeholder="クレジット名（例: Drums, Bass, Guitar）"
          value={credit}
          onChange={(e) => setcredit(e.target.value)}
          size="sm"
        />
        <Input
          placeholder="ジャンル"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
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
          検索
        </Button>
      </VStack>

      <Box mt={4} maxH="400px" overflowY="auto">
        {isSearching ? (
          <Spinner size="ml" mt={4} />
        ) : (
          <>
            {results.length > 0 && (
              <Text fontSize="sm" color="gray.600" mb={2}>
                {results.length} 件
              </Text>
            )}
            <ResultList
              results={results}
              searchParams={{ q, credit, genre }}
            />
          </>
        )}
      </Box>
    </Box>
  )
}
