import { useEffect, useState, type FormEvent, type MouseEvent } from "react"
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "react-router"
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
  Text,
} from "@chakra-ui/react"

import { AppIcon } from "../components/AppIcon"
import { ResultList, ResultListSkeleton } from "../components/ResultList"
import { SearchResult } from "../types"
import { searchDiscogsAlbums } from "../utils/discogsSearch"
import {
  DiscogsFetchError,
} from "../utils/discogsAuthMiddleware"
import { rankSearchResults } from "../utils/searchRanking"

type SuggestionData = {
  suggestions: SearchResult[]
}

type LoaderData = {
  results: SearchResult[]
  errorMessage?: string
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const credit = (
    url.searchParams.get("credit") ||
    url.searchParams.get("person") ||
    ""
  ).trim()
  const song = (
    url.searchParams.get("song") ||
    url.searchParams.get("q") ||
    url.searchParams.get("artist") ||
    ""
  ).trim()
  const genre = (url.searchParams.get("genre") || "").trim()

  if (!credit && !song && !genre) {
    return { results: [] }
  }

  try {
    const searchResults = await searchDiscogsAlbums({
      credit,
      song,
      genre,
    })
    const results = rankSearchResults(searchResults.results, {
      credit,
      song,
      genre,
    })

    return {
      results,
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
      errorMessage: getSearchErrorMessage(error),
    }
  }
}

export default function SearchPage() {
  const { results, errorMessage } = useLoaderData<LoaderData>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const navigation = useNavigation()
  const suggestionsFetcher = useFetcher<SuggestionData>()

  const submittedCredit = (
    searchParams.get("credit") ||
    searchParams.get("person") ||
    ""
  ).trim()
  const submittedSong = (
    searchParams.get("song") ||
    searchParams.get("q") ||
    searchParams.get("artist") ||
    ""
  ).trim()
  const submittedGenre = (searchParams.get("genre") || "").trim()
  const submittedRole = (searchParams.get("role") || "").trim()

  const [credit, setCredit] = useState(() => submittedCredit)
  const [song, setSong] = useState(() => submittedSong)
  const [genre, setGenre] = useState(() => submittedGenre)
  const [role, setRole] = useState(() => submittedRole)
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false)

  const hasSearchCriteria = Boolean(
    submittedCredit || submittedSong || submittedGenre
  )
  const isSearchPending =
    navigation.state === "loading" && navigation.location?.pathname === "/search"
  const isSearchDisabled =
    (!credit.trim() && !song.trim() && !genre.trim()) || isSearchPending
  const suggestions = suggestionsFetcher.data?.suggestions || []
  const showSuggestions =
    isSuggestionOpen && song.trim().length >= 3 && suggestions.length > 0

  useEffect(() => {
    setCredit(submittedCredit)
    setSong(submittedSong)
    setGenre(submittedGenre)
    setRole(submittedRole)
  }, [submittedCredit, submittedGenre, submittedRole, submittedSong])

  useEffect(() => {
    const query = song.trim()
    if (query.length < 3) return

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({ song: query })
      if (credit) params.set("credit", credit)
      if (genre) params.set("genre", genre)
      suggestionsFetcher.load(`/search/suggestions?${params.toString()}`)
    }, 600)

    return () => window.clearTimeout(timeout)
  }, [credit, genre, song, suggestionsFetcher])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const params = new URLSearchParams()
    const nextCredit = credit.trim()
    const nextSong = song.trim()
    const nextGenre = genre.trim()
    const nextRole = role.trim()
    if (nextCredit) params.append("credit", nextCredit)
    if (nextSong) params.append("song", nextSong)
    if (nextGenre) params.append("genre", nextGenre)
    if (nextRole) params.append("role", nextRole)
    navigate({
      pathname: "/search",
      search: params.toString() ? `?${params.toString()}` : "",
    })
  }

  const buildSuggestionHref = (suggestion: SearchResult) => {
    const params = new URLSearchParams()
    params.set("song", song || suggestion.title)
    if (credit) params.set("credit", credit)
    if (genre) params.set("genre", genre)
    if (role) params.set("role", role)
    if (suggestion.type === "release") params.set("kind", "release")
    return `/search/${suggestion.id}?${params.toString()}`
  }

  return (
    <Box
      minH="100vh"
      bg="gray.50"
      px={{ base: 4, md: 6 }}
      py={{ base: 5, md: 8 }}
    >
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
              Sideman Album Finder
            </Heading>
            <Text fontSize="sm" color="gray.600">
              {isSearchPending
                ? "Searching albums"
                : results.length > 0
                  ? `${results.length} albums`
                  : hasSearchCriteria
                    ? "No albums found"
                    : "Search by player"}
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
            <InputGroup
              size="md"
              gridColumn={{ base: "auto", md: "1 / -1", lg: "auto" }}
            >
              <InputLeftElement color="gray.400">
                <AppIcon name="user" size={17} />
              </InputLeftElement>
              <Input
                placeholder="Credit / performer, e.g. Tony Williams"
                value={credit}
                onChange={(event) => setCredit(event.target.value)}
                bg="white"
              />
            </InputGroup>

            <Box
              position="relative"
              gridColumn={{ base: "auto", md: "1 / 2", lg: "auto" }}
            >
              <InputGroup size="md">
                <InputLeftElement color="gray.400">
                  <AppIcon name="music" size={17} />
                </InputLeftElement>
                <Input
                  placeholder="Song / track, e.g. Night in Tunisia"
                  value={song}
                  onChange={(event) => {
                    setSong(event.target.value)
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
                      onMouseDown={(event: MouseEvent) => event.preventDefault()}
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

            <InputGroup
              size="md"
              gridColumn={{ base: "auto", md: "2 / 3", lg: "auto" }}
            >
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

            <InputGroup
              size="md"
              gridColumn={{ base: "auto", md: "1 / 3", lg: "1 / 4" }}
            >
              <InputLeftElement color="gray.400">
                <AppIcon name="mic" size={16} />
              </InputLeftElement>
              <Input
                placeholder="Instrument / role filter, e.g. drums"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                list="role-suggestions"
                bg="white"
              />
            </InputGroup>

            <Button
              colorScheme="blue"
              type="submit"
              isDisabled={isSearchDisabled}
              isLoading={isSearchPending}
              loadingText="Searching"
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
          <datalist id="role-suggestions">
            <option value="drums" />
            <option value="bass" />
            <option value="guitar" />
            <option value="piano" />
            <option value="saxophone" />
            <option value="vocals" />
          </datalist>
        </Box>

        <Box mt={4}>
          {isSearchPending ? (
            <ResultListSkeleton />
          ) : (
            <>
              {errorMessage && (
                <Alert status="warning" mb={3} borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              {results.length > 0 || !errorMessage ? (
                <ResultList
                  results={results}
                  hasSearched={hasSearchCriteria}
                  searchParams={{
                    credit: submittedCredit,
                    song: submittedSong,
                    genre: submittedGenre,
                    role,
                  }}
                />
              ) : null}
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
