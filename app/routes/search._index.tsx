import { useEffect, useState } from "react"
import { useFetcher, useLoaderData, useSearchParams } from "@remix-run/react"
import {
  DiscogsFetchError,
  discogsFetch,
} from "../utils/discogsAuthMiddleware"
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Text,
} from "@chakra-ui/react"

import { AppIcon } from "../components/AppIcon"
import { ResultList } from "../components/ResultList"
import { SearchParam, SearchResult } from "../types"
import { rankSearchResults } from "../utils/searchRanking"

type SuggestionData = {
  suggestions: SearchResult[]
}

type LoaderData = {
  results: SearchResult[]
  isSearching: boolean
  errorMessage?: string
}

type DiscogsSearchResponse = {
  results?: SearchResult[]
  pagination?: {
    page: number
    pages: number
  }
  rateLimited?: boolean
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

  try {
    const params: SearchParam = {
      q: q || null,
      credit: credit || null,
      genre: genre || null,
      type: "master",
      per_page: 100,
      page: 1,
    }
    let searchResults = await discogsFetch<DiscogsSearchResponse>(
      "database/search",
      params
    )
    let allResults = searchResults.results || []

    const MAX = credit || genre ? 2 : 1
    while (
      searchResults.pagination &&
      searchResults.pagination.page < searchResults.pagination.pages &&
      searchResults.pagination.page < MAX
    ) {
      params.page = searchResults.pagination.page + 1
      searchResults = await discogsFetch<DiscogsSearchResponse>(
        "database/search",
        params
      )
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
      isSearching: false,
      errorMessage: getSearchErrorMessage(error),
    }
  }
}

export default function SearchPage() {
  const {
    results,
    isSearching,
    errorMessage,
  } = useLoaderData<LoaderData>()
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
    isSuggestionOpen && q.trim().length >= 3 && suggestions.length > 0

  useEffect(() => {
    const query = q.trim()
    if (query.length < 3) return

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({ q: query })
      if (credit) params.set("credit", credit)
      if (genre) params.set("genre", genre)
      suggestionsFetcher.load(`/search/suggestions?${params.toString()}`)
    }, 600)

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
    <Box minH="100vh" bg="gray.50" px={{ base: 4, md: 6 }} py={{ base: 5, md: 8 }}>
      <Box maxW="980px" mx="auto">
        <HStack spacing={3} mb={5} align="center">
          <Box
            alignItems="center"
            bg="black"
            borderRadius="md"
            color="white"
            display="flex"
            h="40px"
            justifyContent="center"
            w="40px"
          >
            <AppIcon name="disc" size={22} />
          </Box>
          <Box>
            <Heading as="h1" size="md">
              Discogs Credits Finder
            </Heading>
            <Text fontSize="sm" color="gray.600">
              {results.length > 0 ? `${results.length} matches` : "Ready"}
            </Text>
          </Box>
        </HStack>

        <Box
          as="form"
          onSubmit={handleSubmit}
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          p={{ base: 3, md: 4 }}
          boxShadow="sm"
        >
          <Grid
            gap={2}
            templateColumns={{
              base: "1fr",
              md: "minmax(0, 1fr) minmax(180px, 220px) 140px",
              lg: "minmax(0, 1fr) minmax(190px, 230px) minmax(150px, 180px) 140px",
            }}
          >
            <Box position="relative" gridColumn={{ base: "auto", md: "1 / -1", lg: "auto" }}>
              <InputGroup size="md">
                <InputLeftElement color="gray.400">
                  <AppIcon name="search" size={17} />
                </InputLeftElement>
                <Input
                  placeholder="Track or artist, e.g. Thriller Michael Jackson"
                  value={q}
                  onChange={(event) => {
                    setQ(event.target.value)
                    setIsSuggestionOpen(true)
                  }}
                  onFocus={() => setIsSuggestionOpen(true)}
                  onBlur={() => setIsSuggestionOpen(false)}
                  autoComplete="off"
                  bg="white"
                />
              </InputGroup>
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
                  px={4}
                  py={2}
                  _hover={{ bg: "gray.50" }}
                  onMouseDown={(event: React.MouseEvent) =>
                    event.preventDefault()
                  }
                >
                  <HStack spacing={2}>
                    <Text color="gray.400">
                      <AppIcon name="music" size={15} />
                    </Text>
                    <Box minW={0}>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {suggestion.title}
                      </Text>
                      {suggestion.year && (
                        <Text fontSize="xs" color="gray.500">
                          {suggestion.year}
                        </Text>
                      )}
                    </Box>
                  </HStack>
                </Box>
              ))}
            </Box>
          )}
            </Box>
            <InputGroup size="md" gridColumn={{ base: "auto", md: "1 / 2", lg: "auto" }}>
              <InputLeftElement color="gray.400">
                <AppIcon name="mic" size={17} />
              </InputLeftElement>
              <Input
                placeholder="Role or credit"
                value={credit}
                onChange={(event) => setCredit(event.target.value)}
                bg="white"
              />
            </InputGroup>
            <InputGroup size="md" gridColumn={{ base: "auto", md: "2 / 3", lg: "auto" }}>
              <InputLeftElement color="gray.400">
                <AppIcon name="tag" size={16} />
              </InputLeftElement>
              <Input
                placeholder="Genre"
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                list="genre-suggestions"
                bg="white"
              />
            </InputGroup>
            <Button
              colorScheme="blue"
              type="submit"
              isDisabled={isSearchDisabled}
              leftIcon={<AppIcon name="search" size={16} />}
              gridColumn={{ base: "auto", md: "3 / 4", lg: "auto" }}
              h="40px"
              px={4}
              w="100%"
              whiteSpace="nowrap"
            >
              Search
            </Button>
          </Grid>
          <datalist id="genre-suggestions">
            <option value="Jazz" />
            <option value="Rock" />
            <option value="Pop" />
            <option value="Classical" />
            <option value="Hip Hop" />
            <option value="Electronic" />
          </datalist>
        </Box>

        <Box mt={4}>
          {isSearching ? (
            <HStack color="gray.600" py={8} justify="center">
              <Spinner size="md" />
              <Text fontSize="sm">Searching</Text>
            </HStack>
          ) : (
            <>
              {errorMessage && (
                <Alert status="warning" mb={3} borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              <ResultList results={results} searchParams={{ q, credit, genre }} />
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
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
