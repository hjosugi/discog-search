import { useMemo } from "react"
import {
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router"
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Heading,
  HStack,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react"

import { AppIcon } from "../components/AppIcon"
import { ResultList, ResultListSkeleton } from "../components/ResultList"
import { SearchForm } from "../components/search/SearchForm"
import { SearchHistoryPanel } from "../components/search/SearchHistoryPanel"
import {
  useSearchHistory,
  type SearchHistoryInput,
} from "../hooks/useSearchHistory"
import { getActiveLocale, useI18n } from "../i18n/I18nProvider"
import {
  createTranslator,
  formatNumber,
  translateApiError,
  type Translate,
} from "../i18n/locale"
import type { SearchResult } from "../types"
import {
  api,
  getApiErrorCode,
  getApiErrorMessage,
  toQueryObject,
} from "../utils/apiClient"
import {
  buildPageMeta,
  compactText,
} from "../utils/pageMeta"
import {
  buildSearchParams,
  DEFAULT_PAGINATION,
  formatSearchCriteria,
  getResultSearchParams,
  getSearchState,
  type SearchState,
} from "../utils/searchState"

type LoaderData = {
  results: SearchResult[]
  pagination: {
    page: number
    totalPages: number
    totalItems: number
    reachedPageLimit: boolean
  }
  errorMessage?: string
  errorCode?: string
}

type SearchMetaArgs = {
  data?: LoaderData
  location: {
    search: string
  }
}

export function meta({ data, location }: SearchMetaArgs) {
  const locale = getActiveLocale()
  const t = createTranslator(locale)
  const searchState = getSearchState(new URLSearchParams(location.search))
  const criteria = formatSearchCriteria(searchState, t)
  const title = criteria
    ? `${criteria} | ${t("app.name")}`
    : t("search.meta.defaultTitle")
  const resultCount = data?.pagination.totalItems || data?.results.length || 0
  const description = criteria
    ? t("search.meta.description", {
        prefix: resultCount
          ? t("search.meta.matches", { count: formatNumber(locale, resultCount) })
          : t("search.meta.searchFor"),
        criteria,
      })
    : t("search.meta.defaultDescription")

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
      errorCode: getApiErrorCode(response.error) ?? "search_failed",
    }
  }

  return response.data ?? { results: [], pagination: DEFAULT_PAGINATION }
}

export default function SearchPage() {
  const { results, pagination, errorMessage, errorCode } =
    useLoaderData<LoaderData>()
  const { t, formatNumber: formatCount } = useI18n()
  const [searchParams] = useSearchParams()
  const navigation = useNavigation()
  const submittedState = getSearchState(searchParams)
  const historyKey = buildSearchParams({ ...submittedState, page: 1 }).toString()
  const activeHistorySearch = useMemo<SearchHistoryInput | null>(() => {
    const state = getSearchState(new URLSearchParams(historyKey))
    if (!state.credit && !state.song && !state.genre) return null

    return {
      credit: state.credit,
      song: state.song,
      genre: state.genre,
      role: state.role,
      year: state.year,
      decade: state.decade,
      country: state.country,
      format: state.format,
      sort: state.sort,
    }
  }, [historyKey])
  const searchHistory = useSearchHistory(activeHistorySearch)

  const hasSearchCriteria = Boolean(
    submittedState.credit || submittedState.song || submittedState.genre
  )
  const isSearchPending =
    navigation.state === "loading" && navigation.location?.pathname === "/search"
  const resultSearchParams = getResultSearchParams(submittedState)
  const headingSummary = getHeadingSummary(
    results.length,
    pagination.totalItems,
    hasSearchCriteria,
    t,
    formatCount
  )
  const errorText =
    errorCode === "search_failed"
      ? t("error.searchFailed")
      : translateApiError(t, errorCode, errorMessage || "")

  return (
    <Box maxW="980px" mx="auto">
      <HStack spacing={3} mb={5} align="center">
        <Text color="text.accent">
          <AppIcon name="search" size={20} />
        </Text>
        <Box>
          <Heading as="h1" size="md">
            {t("search.heading")}
          </Heading>
          <Text fontSize="sm" color="text.muted" role="status">
            {isSearchPending ? t("search.summary.searching") : headingSummary}
          </Text>
        </Box>
      </HStack>

      <SearchForm
        submittedState={submittedState}
        isSearchPending={isSearchPending}
      />

      <SearchHistoryPanel
        entries={searchHistory.entries}
        onClear={searchHistory.clearEntries}
        onRemove={searchHistory.removeEntry}
      />

      <Box as="section" aria-labelledby="search-results-heading" mt={4}>
        <VisuallyHidden as="h2" id="search-results-heading">
          {t("results.heading")}
        </VisuallyHidden>
        {isSearchPending ? (
          <ResultListSkeleton />
        ) : (
          <>
            {errorText && (
              <Alert status="warning" mb={3} borderRadius="md">
                <AlertIcon />
                <AlertDescription>{errorText}</AlertDescription>
              </Alert>
            )}
            {results.length > 0 || !errorText ? (
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

function buildSearchPageHref(searchState: SearchState, page: number) {
  const params = buildSearchParams({ ...searchState, page })
  return `/search?${params.toString()}`
}

function getHeadingSummary(
  resultsCount: number,
  totalItems: number,
  hasSearchCriteria: boolean,
  t: Translate,
  formatCount: (value: number) => string
) {
  if (resultsCount > 0) {
    const total = Math.max(resultsCount, totalItems)
    return resultsCount === total
      ? t("search.summary.results", { count: formatCount(resultsCount) })
      : t("search.summary.partial", {
          count: formatCount(resultsCount),
          total: formatCount(total),
        })
  }

  return hasSearchCriteria ? t("search.summary.none") : t("search.summary.idle")
}
