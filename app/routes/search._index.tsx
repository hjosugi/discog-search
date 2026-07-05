import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react"
import {
  Form,
  Link as RouterLink,
  useFetcher,
  useLoaderData,
  useNavigation,
  useSearchParams,
  useSubmit,
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
  Select,
  SimpleGrid,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react"

import { AppIcon } from "../components/AppIcon"
import { ResultList, ResultListSkeleton } from "../components/ResultList"
import {
  buildSearchHistoryHref,
  buildSearchHistorySummary,
  useSearchHistory,
  type SearchHistoryEntry,
  type SearchHistoryInput,
} from "../hooks/useSearchHistory"
import { SearchResult } from "../types"
import { MAX_SEARCH_PAGES, searchDiscogsAlbums } from "../utils/discogsSearch"
import {
  DiscogsFetchError,
} from "../utils/discogsAuthMiddleware"
import {
  buildPageMeta,
  compactText,
} from "../utils/pageMeta"
import {
  rankSearchResults,
  type SearchSortOption,
} from "../utils/searchRanking"

type SuggestionData = {
  suggestions: SearchResult[]
}

type SearchState = {
  credit: string
  song: string
  genre: string
  role: string
  year: string
  decade: string
  country: string
  format: string
  sort: SearchSortOption
  page: number
}

type LoaderData = {
  results: SearchResult[]
  pagination: {
    page: number
    totalPages: number
    totalItems: number
    reachedPageLimit: boolean
  }
  errorMessage?: string
}

const DEFAULT_PAGINATION = {
  page: 1,
  totalPages: 1,
  totalItems: 0,
  reachedPageLimit: false,
}

const DECADE_OPTIONS = [
  "1940",
  "1950",
  "1960",
  "1970",
  "1980",
  "1990",
  "2000",
  "2010",
  "2020",
]

const FORMAT_OPTIONS = ["LP", "CD", "Album", "Single", '12"', '7"', "Cassette"]

const SORT_OPTIONS: Array<{ value: SearchSortOption; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "year_desc", label: "Year (newest)" },
  { value: "year_asc", label: "Year (oldest)" },
]

type SearchMetaArgs = {
  data?: LoaderData
  location: {
    search: string
  }
}

export function meta({ data, location }: SearchMetaArgs) {
  const searchState = getSearchState(new URLSearchParams(location.search))
  const criteria = formatSearchCriteria(searchState)
  const title = criteria
    ? `${criteria} | Sideman Album Finder`
    : "Sideman Album Finder | Discogs credits search"
  const resultCount = data?.pagination.totalItems || data?.results.length || 0
  const description = criteria
    ? `${resultCount ? `${resultCount} Discogs matches for ` : "Search Discogs album credits for "}${criteria}. Filter by player, track, genre, year, country, format, and role.`
    : "Search Discogs album credits by player, track, genre, year, country, format, and role."

  return buildPageMeta({
    title,
    description: compactText(description),
  })
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const searchState = getSearchState(url.searchParams)
  const { credit, song, genre, year, country, format, sort, page } = searchState

  if (!credit && !song && !genre) {
    return { results: [], pagination: DEFAULT_PAGINATION }
  }

  try {
    const searchResults = await searchDiscogsAlbums({
      credit,
      song,
      genre,
      year,
      country,
      format,
      page,
    })
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

export default function SearchPage() {
  const { results, pagination, errorMessage } = useLoaderData<LoaderData>()
  const [searchParams] = useSearchParams()
  const navigation = useNavigation()
  const submit = useSubmit()
  const suggestionsFetcher = useFetcher<SuggestionData>()
  const submittedState = getSearchState(searchParams)
  const {
    credit: submittedCredit,
    song: submittedSong,
    genre: submittedGenre,
    role: submittedRole,
    year: submittedYear,
    decade: submittedDecade,
    country: submittedCountry,
    format: submittedFormat,
    sort: submittedSort,
  } = submittedState

  const [credit, setCredit] = useState(() => submittedCredit)
  const [song, setSong] = useState(() => submittedSong)
  const [genre, setGenre] = useState(() => submittedGenre)
  const [role, setRole] = useState(() => submittedRole)
  const [year, setYear] = useState(() => submittedYear)
  const [decade, setDecade] = useState(() => submittedDecade)
  const [country, setCountry] = useState(() => submittedCountry)
  const [format, setFormat] = useState(() => submittedFormat)
  const [sort, setSort] = useState<SearchSortOption>(() => submittedSort)
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false)
  const activeHistorySearch = useMemo<SearchHistoryInput | null>(() => {
    if (!submittedCredit && !submittedSong && !submittedGenre) return null

    return {
      credit: submittedCredit,
      song: submittedSong,
      genre: submittedGenre,
      role: submittedRole,
      year: submittedYear,
      decade: submittedDecade,
      country: submittedCountry,
      format: submittedFormat,
      sort: submittedSort,
    }
  }, [
    submittedCountry,
    submittedCredit,
    submittedDecade,
    submittedFormat,
    submittedGenre,
    submittedRole,
    submittedSong,
    submittedSort,
    submittedYear,
  ])
  const searchHistory = useSearchHistory(activeHistorySearch)

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
  const resultSearchParams = getResultSearchParams(submittedState)
  const headingSummary = getHeadingSummary(
    results.length,
    pagination.totalItems,
    hasSearchCriteria
  )

  useEffect(() => {
    setCredit(submittedCredit)
    setSong(submittedSong)
    setGenre(submittedGenre)
    setRole(submittedRole)
    setYear(submittedYear)
    setDecade(submittedDecade)
    setCountry(submittedCountry)
    setFormat(submittedFormat)
    setSort(submittedSort)
  }, [
    submittedCountry,
    submittedCredit,
    submittedDecade,
    submittedFormat,
    submittedGenre,
    submittedRole,
    submittedSong,
    submittedSort,
    submittedYear,
  ])

  useEffect(() => {
    const query = song.trim()
    if (!isSuggestionOpen) return
    if (query.length < 3) return

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({ song: query })
      if (credit) params.set("credit", credit)
      if (genre) params.set("genre", genre)
      suggestionsFetcher.load(`/search/suggestions?${params.toString()}`)
    }, 600)

    return () => window.clearTimeout(timeout)
  }, [credit, genre, isSuggestionOpen, song, suggestionsFetcher])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const params = new URLSearchParams()
    const nextCredit = credit.trim()
    const nextSong = song.trim()
    const nextGenre = genre.trim()
    const nextRole = role.trim()
    const nextYear = year.trim()
    const nextDecade = decade.trim()
    const nextCountry = country.trim()
    const nextFormat = format.trim()
    if (nextCredit) params.append("credit", nextCredit)
    if (nextSong) params.append("song", nextSong)
    if (nextGenre) params.append("genre", nextGenre)
    if (nextRole) params.append("role", nextRole)
    if (nextYear) {
      params.append("year", nextYear)
    } else if (nextDecade) {
      params.append("decade", nextDecade)
    }
    if (nextCountry) params.append("country", nextCountry)
    if (nextFormat) params.append("format", nextFormat)
    if (sort !== "relevance") params.append("sort", sort)
    submit(params, { action: "/search", method: "get" })
  }

  const buildSuggestionHref = (suggestion: SearchResult) => {
    const params = new URLSearchParams()
    params.set("song", song || suggestion.title)
    if (credit) params.set("credit", credit)
    if (genre) params.set("genre", genre)
    if (role) params.set("role", role)
    if (year) {
      params.set("year", year)
    } else if (decade) {
      params.set("decade", decade)
    }
    if (country) params.set("country", country)
    if (format) params.set("format", format)
    if (sort !== "relevance") params.set("sort", sort)
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
                : headingSummary}
            </Text>
          </Box>
        </HStack>

        <Box
          as={Form}
          action="/search"
          method="get"
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
                name="credit"
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
                  name="song"
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
                name="genre"
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
                name="role"
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

          <SimpleGrid
            columns={{ base: 1, md: 4 }}
            gap={2}
            mt={3}
          >
            <Input
              aria-label="Year"
              inputMode="numeric"
              maxLength={4}
              placeholder="Year"
              value={year}
              onChange={(event) => {
                setYear(event.target.value)
                if (event.target.value.trim()) setDecade("")
              }}
              bg="white"
            />
            <Input
              aria-label="Country"
              placeholder="Country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              list="country-suggestions"
              bg="white"
            />
            <Select
              aria-label="Format"
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              bg="white"
            >
              <option value="">Any format</option>
              {FORMAT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Sort"
              value={sort}
              onChange={(event) => setSort(getSortOption(event.target.value))}
              bg="white"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </SimpleGrid>

          <Wrap mt={3} spacing={2}>
            <WrapItem>
              <Button
                type="button"
                size="sm"
                variant={!decade ? "solid" : "outline"}
                colorScheme={!decade ? "blue" : "gray"}
                onClick={() => setDecade("")}
              >
                Any decade
              </Button>
            </WrapItem>
            {DECADE_OPTIONS.map((option) => (
              <WrapItem key={option}>
                <Button
                  type="button"
                  size="sm"
                  variant={decade === option ? "solid" : "outline"}
                  colorScheme={decade === option ? "blue" : "gray"}
                  aria-pressed={decade === option}
                  onClick={() => {
                    setYear("")
                    setDecade(decade === option ? "" : option)
                  }}
                >
                  {option}s
                </Button>
              </WrapItem>
            ))}
          </Wrap>

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
          <datalist id="country-suggestions">
            <option value="US" />
            <option value="UK" />
            <option value="Japan" />
            <option value="France" />
            <option value="Germany" />
            <option value="Italy" />
          </datalist>
        </Box>

        <SearchHistoryPanel
          entries={searchHistory.entries}
          onClear={searchHistory.clearEntries}
          onRemove={searchHistory.removeEntry}
        />

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
                  searchParams={resultSearchParams}
                  pagination={{
                    ...pagination,
                    nextPageHref: buildSearchPageHref(
                      submittedState,
                      pagination.page + 1
                    ),
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

function SearchHistoryPanel({
  entries,
  onClear,
  onRemove,
}: {
  entries: SearchHistoryEntry[]
  onClear: () => void
  onRemove: (id: string) => void
}) {
  if (entries.length === 0) return null

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      boxShadow="sm"
      mt={3}
      p={3}
    >
      <HStack justify="space-between" mb={2} spacing={3}>
        <HStack color="gray.700" spacing={2}>
          <AppIcon name="clock" size={15} />
          <Text fontSize="sm" fontWeight="semibold">
            Recent Searches
          </Text>
        </HStack>
        <Button size="xs" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </HStack>
      <VStack align="stretch" spacing={1}>
        {entries.map((entry, index) => {
          const summary = buildSearchHistorySummary(entry)

          return (
            <HStack key={entry.id} spacing={2}>
              <Button
                as={RouterLink}
                to={buildSearchHistoryHref(entry)}
                justifyContent="flex-start"
                leftIcon={<AppIcon name="search" size={14} />}
                minW={0}
                size="sm"
                variant="ghost"
                whiteSpace="normal"
                w="100%"
              >
                <Text as="span" noOfLines={1}>
                  {summary}
                </Text>
              </Button>
              <Button
                aria-label={`Delete recent item ${index + 1}`}
                flexShrink={0}
                onClick={() => onRemove(entry.id)}
                size="sm"
                variant="ghost"
              >
                <AppIcon name="x" size={14} />
              </Button>
            </HStack>
          )
        })}
      </VStack>
    </Box>
  )
}

function getSearchState(searchParams: URLSearchParams): SearchState {
  const year = getYearOption(searchParams.get("year"))

  return {
    credit: (
      searchParams.get("credit") ||
      searchParams.get("person") ||
      ""
    ).trim(),
    song: (
      searchParams.get("song") ||
      searchParams.get("q") ||
      searchParams.get("artist") ||
      ""
    ).trim(),
    genre: (searchParams.get("genre") || "").trim(),
    role: (searchParams.get("role") || "").trim(),
    year,
    decade: year ? "" : getDecadeOption(searchParams.get("decade")),
    country: (searchParams.get("country") || "").trim(),
    format: (searchParams.get("format") || "").trim(),
    sort: getSortOption(searchParams.get("sort")),
    page: getPageOption(searchParams.get("page")),
  }
}

function getResultSearchParams(searchState: SearchState) {
  return Object.fromEntries(buildSearchParams(searchState)) as {
    [key: string]: string
  }
}

function buildSearchPageHref(searchState: SearchState, page: number) {
  const params = buildSearchParams({ ...searchState, page })
  return `/search?${params.toString()}`
}

function buildSearchParams(searchState: SearchState) {
  const params = new URLSearchParams()

  if (searchState.credit) params.set("credit", searchState.credit)
  if (searchState.song) params.set("song", searchState.song)
  if (searchState.genre) params.set("genre", searchState.genre)
  if (searchState.role) params.set("role", searchState.role)
  if (searchState.year) {
    params.set("year", searchState.year)
  } else if (searchState.decade) {
    params.set("decade", searchState.decade)
  }
  if (searchState.country) params.set("country", searchState.country)
  if (searchState.format) params.set("format", searchState.format)
  if (searchState.sort !== "relevance") params.set("sort", searchState.sort)
  if (searchState.page > 1) params.set("page", String(searchState.page))

  return params
}

function formatSearchCriteria(searchState: SearchState) {
  const parts = [
    searchState.credit && `"${searchState.credit}" credits`,
    searchState.song && `"${searchState.song}" tracks`,
    searchState.genre && `${searchState.genre} albums`,
    searchState.year && searchState.year,
    searchState.decade && `${searchState.decade}s`,
    searchState.country && searchState.country,
    searchState.format && searchState.format,
    searchState.role && searchState.role,
  ].filter(Boolean)

  return parts.join(" / ")
}

function filterResultsByDecade(results: SearchResult[], searchState: SearchState) {
  if (!searchState.decade || searchState.year) return results

  const decadeStart = Number(searchState.decade)
  if (!Number.isFinite(decadeStart)) return results
  const decadeEnd = decadeStart + 9

  return results.filter((result) => {
    const year = Number(result.year)
    return Number.isFinite(year) && year >= decadeStart && year <= decadeEnd
  })
}

function getHeadingSummary(
  resultsCount: number,
  totalItems: number,
  hasSearchCriteria: boolean
) {
  if (resultsCount > 0) {
    const total = Math.max(resultsCount, totalItems)
    return resultsCount === total
      ? `${formatCount(resultsCount)} albums`
      : `${formatCount(resultsCount)} of ${formatCount(total)} albums`
  }

  return hasSearchCriteria ? "No albums found" : "Search by player"
}

function getSortOption(value: string | null): SearchSortOption {
  return value === "year_desc" || value === "year_asc" ? value : "relevance"
}

function getPageOption(value: string | null) {
  const page = Number(value || 1)
  return Number.isFinite(page) && page > 0
    ? Math.min(Math.floor(page), MAX_SEARCH_PAGES)
    : 1
}

function getYearOption(value: string | null) {
  const year = (value || "").trim()
  return /^\d{4}$/.test(year) ? year : ""
}

function getDecadeOption(value: string | null) {
  const decade = (value || "").trim().replace(/s$/i, "")
  return DECADE_OPTIONS.includes(decade) ? decade : ""
}

function formatCount(value: number) {
  return value.toLocaleString("en-US")
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
