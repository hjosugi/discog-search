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
import { api, getApiErrorMessage, toQueryObject } from "../utils/apiClient"
import {
  buildPageMeta,
  compactText,
} from "../utils/pageMeta"
import type { SearchSortOption } from "../utils/searchRanking"
import {
  buildSearchParams,
  DECADE_OPTIONS,
  DEFAULT_PAGINATION,
  formatSearchCriteria,
  getResultSearchParams,
  getSearchState,
  getSortOption,
  type SearchState,
} from "../utils/searchState"

type SuggestionData = {
  suggestions: SearchResult[]
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

export async function clientLoader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const response = await api.api.search.get({
    query: toQueryObject(url.searchParams),
  })

  if (response.error) {
    return {
      results: [],
      pagination: DEFAULT_PAGINATION,
      errorMessage: getApiErrorMessage(
        response.error,
        "Could not fetch Discogs search results. Please try again."
      ),
    }
  }

  return response.data ?? { results: [], pagination: DEFAULT_PAGINATION }
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
    <Box maxW="980px" mx="auto">
        <HStack spacing={3} mb={5} align="center">
          <Text color="text.accent">
            <AppIcon name="search" size={20} />
          </Text>
          <Box>
            <Heading as="h1" size="md">
              Search albums
            </Heading>
            <Text fontSize="sm" color="text.muted">
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
          bg="bg.surface"
          borderWidth="1px"
          borderColor="border.default"
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
              <InputLeftElement color="text.icon">
                <AppIcon name="user" size={17} />
              </InputLeftElement>
              <Input
                name="credit"
                placeholder="Credit / performer, e.g. Tony Williams"
                value={credit}
                onChange={(event) => setCredit(event.target.value)}
                bg="bg.surface"
              />
            </InputGroup>

            <Box
              position="relative"
              gridColumn={{ base: "auto", md: "1 / 2", lg: "auto" }}
            >
              <InputGroup size="md">
                <InputLeftElement color="text.icon">
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
                  bg="bg.surface"
                />
              </InputGroup>

              {showSuggestions && (
                <Box
                  position="absolute"
                  zIndex={10}
                  top="calc(100% + 4px)"
                  left={0}
                  right={0}
                  bg="bg.surface"
                  borderWidth="1px"
                  borderColor="border.default"
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
                      _hover={{ bg: "bg.subtle" }}
                      onMouseDown={(event: MouseEvent) => event.preventDefault()}
                    >
                      <HStack spacing={2}>
                        <Text color="text.icon">
                          <AppIcon name="music" size={15} />
                        </Text>
                        <Box minW={0}>
                          <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                            {suggestion.title}
                          </Text>
                          {suggestion.year && (
                            <Text fontSize="xs" color="text.subtle">
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
              <InputLeftElement color="text.icon">
                <AppIcon name="tag" size={16} />
              </InputLeftElement>
              <Input
                name="genre"
                placeholder="Genre"
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                list="genre-suggestions"
                bg="bg.surface"
              />
            </InputGroup>

            <InputGroup
              size="md"
              gridColumn={{ base: "auto", md: "1 / 3", lg: "1 / 4" }}
            >
              <InputLeftElement color="text.icon">
                <AppIcon name="mic" size={16} />
              </InputLeftElement>
              <Input
                name="role"
                placeholder="Instrument / role filter, e.g. drums"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                list="role-suggestions"
                bg="bg.surface"
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
              bg="bg.surface"
            />
            <Input
              aria-label="Country"
              placeholder="Country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              list="country-suggestions"
              bg="bg.surface"
            />
            <Select
              aria-label="Format"
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              bg="bg.surface"
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
              bg="bg.surface"
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
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      boxShadow="sm"
      mt={3}
      p={3}
    >
      <HStack justify="space-between" mb={2} spacing={3}>
        <HStack color="text.secondary" spacing={2}>
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

function buildSearchPageHref(searchState: SearchState, page: number) {
  const params = buildSearchParams({ ...searchState, page })
  return `/search?${params.toString()}`
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

function formatCount(value: number) {
  return value.toLocaleString("en-US")
}
