import {
  Badge,
  Box,
  Button,
  HStack,
  Heading,
  Image,
  Skeleton,
  SkeletonText,
  Spinner,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react"
import { Link } from "react-router"

import { useI18n } from "../i18n/I18nProvider"
import type { Translate } from "../i18n/locale"
import type { SearchResult } from "../types"
import type { FavoriteAlbumInput } from "../utils/favorites"
import { AppIcon } from "./AppIcon"
import { FavoriteButton } from "./FavoriteButton"

export function ResultList({
  results,
  hasSearched,
  searchParams,
  pagination,
}: {
  results: SearchResult[]
  hasSearched: boolean
  searchParams: { [key: string]: string }
  pagination?: {
    page: number
    totalPages: number
    totalItems: number
    reachedPageLimit: boolean
    nextPageHref: string
  }
}) {
  if (results.length === 0) {
    return hasSearched ? (
      <EmptySearchState searchParams={searchParams} />
    ) : (
      <InitialSearchGuide />
    )
  }

  return (
    <Box mt={5}>
      {pagination ? (
        <PaginationSummary resultsCount={results.length} pagination={pagination} />
      ) : null}
      {results.map((result) => {
        const summary = buildSummary(result)
        const queryString = buildSearchParams(searchParams, result)

        return (
          <Box
            key={result.id}
            mb={3}
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="md"
            transition="border-color 120ms ease, box-shadow 120ms ease"
            _hover={{ borderColor: "border.hover", boxShadow: "sm" }}
            display="flex"
            alignItems="flex-start"
          >
            <Box flex="1" minW={0}>
              <Link to={`/search/${result.id}${queryString ? `?${queryString}` : ""}`}>
                <HStack align="start" spacing={3} p={3}>
                  {result.thumb ? (
                    <Image
                      src={result.thumb}
                      alt=""
                      boxSize={{ base: "56px", md: "64px" }}
                      objectFit="cover"
                      borderRadius="sm"
                      flexShrink={0}
                    />
                  ) : (
                    <Box
                      alignItems="center"
                      boxSize={{ base: "56px", md: "64px" }}
                      bg="bg.muted"
                      borderRadius="sm"
                      color="text.icon"
                      display="flex"
                      flexShrink={0}
                      justifyContent="center"
                    >
                      <AppIcon name="disc" size={24} />
                    </Box>
                  )}
                  <VStack align="stretch" spacing={2} flex="1" minW={0}>
                    <HStack align="start" justify="space-between" spacing={3}>
                      <Box minW={0}>
                        <Text as="h3" fontSize="md" fontWeight="semibold" noOfLines={2}>
                          {result.title}
                        </Text>
                        {summary && (
                          <HStack color="text.muted" spacing={1} mt={1}>
                            <AppIcon name="tag" size={13} />
                            <Text fontSize="sm" noOfLines={1}>
                              {summary}
                            </Text>
                          </HStack>
                        )}
                      </Box>
                      <Text color="text.icon" flexShrink={0} mt={1}>
                        <AppIcon name="external" size={15} />
                      </Text>
                    </HStack>
                    <Wrap spacing={1}>
                      {buildTags(result).map((tag) => (
                        <WrapItem key={tag}>
                          <Badge
                            bg="bg.muted"
                            color="text.secondary"
                            fontWeight="medium"
                            textTransform="none"
                          >
                            {tag}
                          </Badge>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </VStack>
                </HStack>
              </Link>
            </Box>
            <FavoriteButton
              album={toFavoriteInput(result, searchParams)}
              flexShrink={0}
              mt={2}
              mr={2}
            />
          </Box>
        )
      })}
      {pagination ? <PaginationFooter pagination={pagination} /> : null}
    </Box>
  )
}

export function ResultListSkeleton() {
  const { t } = useI18n()

  return (
    <Box mt={5} role="status" aria-live="polite">
      <HStack color="text.muted" mb={3} spacing={2}>
        <Spinner size="sm" />
        <Text fontSize="sm" fontWeight="medium">
          {t("results.searching")}
        </Text>
      </HStack>
      {[0, 1, 2].map((item) => (
        <Box
          key={item}
          mb={3}
          bg="bg.surface"
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="md"
          p={3}
        >
          <HStack align="start" spacing={3}>
            <Skeleton
              borderRadius="sm"
              flexShrink={0}
              h={{ base: "56px", md: "64px" }}
              w={{ base: "56px", md: "64px" }}
            />
            <Box flex="1" minW={0} pt={1}>
              <SkeletonText noOfLines={2} spacing={3} skeletonHeight={3} />
              <HStack mt={4} spacing={2}>
                <Skeleton borderRadius="sm" h="18px" w="56px" />
                <Skeleton borderRadius="sm" h="18px" w="72px" />
                <Skeleton borderRadius="sm" h="18px" w="48px" />
              </HStack>
            </Box>
          </HStack>
        </Box>
      ))}
    </Box>
  )
}

function InitialSearchGuide() {
  const { t } = useI18n()
  const examples = [
    { label: "credit: Tony Williams", to: "/search?credit=Tony+Williams" },
    { label: "song: Nefertiti", to: "/search?song=Nefertiti" },
    { label: "genre: Jazz", to: "/search?genre=Jazz" },
  ]

  return (
    <Box
      mt={5}
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      p={{ base: 4, md: 5 }}
    >
      <HStack align="start" spacing={3}>
        <Box
          alignItems="center"
          bg="bg.accent"
          borderRadius="md"
          color="text.accent"
          display="flex"
          flexShrink={0}
          h="40px"
          justifyContent="center"
          w="40px"
        >
          <AppIcon name="spark" size={20} />
        </Box>
        <Box minW={0}>
          <Heading as="h2" size="sm">
            {t("results.guide.title")}
          </Heading>
          <Text color="text.muted" fontSize="sm" mt={1}>
            {t("results.guide.examples")}
          </Text>
          <Wrap mt={3} spacing={2}>
            {examples.map((example) => (
              <WrapItem key={example.to}>
                <Box
                  as={Link}
                  to={example.to}
                  bg="bg.subtle"
                  borderWidth="1px"
                  borderColor="border.default"
                  borderRadius="md"
                  color="text.secondary"
                  fontSize="sm"
                  fontWeight="medium"
                  px={3}
                  py={2}
                  _hover={{ bg: "bg.selected", borderColor: "border.selected" }}
                >
                  {example.label}
                </Box>
              </WrapItem>
            ))}
          </Wrap>
        </Box>
      </HStack>
    </Box>
  )
}

function EmptySearchState({
  searchParams,
}: {
  searchParams: { [key: string]: string }
}) {
  const { t } = useI18n()
  const summary = buildSearchSummary(searchParams, t)
  const relaxedLinks = buildRelaxedSearchLinks(searchParams, t)

  return (
    <Box
      mt={5}
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      p={{ base: 4, md: 5 }}
    >
      <HStack align="start" spacing={3}>
        <Box
          alignItems="center"
          bg="bg.muted"
          borderRadius="md"
          color="text.subtle"
          display="flex"
          flexShrink={0}
          h="40px"
          justifyContent="center"
          w="40px"
        >
          <AppIcon name="search" size={20} />
        </Box>
        <Box minW={0}>
          <Heading as="h2" size="sm">
            {t("results.empty.title", { summary })}
          </Heading>
          <VStack align="stretch" color="text.muted" fontSize="sm" mt={2} spacing={1}>
            <Text>{t("results.empty.spelling")}</Text>
            <Text>{t("results.empty.single")}</Text>
            {searchParams.genre ? <Text>{t("results.empty.genreHint")}</Text> : null}
          </VStack>
          {relaxedLinks.length > 0 ? (
            <Wrap mt={4} spacing={2}>
              {relaxedLinks.map((link) => (
                <WrapItem key={link.to}>
                  <Box
                    as={Link}
                    to={link.to}
                    bg="bg.subtle"
                    borderWidth="1px"
                    borderColor="border.default"
                    borderRadius="md"
                    color="text.secondary"
                    fontSize="sm"
                    fontWeight="medium"
                    px={3}
                    py={2}
                    _hover={{ bg: "bg.selected", borderColor: "border.selected" }}
                  >
                    {link.label}
                  </Box>
                </WrapItem>
              ))}
            </Wrap>
          ) : null}
        </Box>
      </HStack>
    </Box>
  )
}

function toFavoriteInput(
  result: SearchResult,
  searchParams: { [key: string]: string }
): FavoriteAlbumInput {
  return {
    id: String(result.id),
    kind: result.type === "release" ? "release" : "master",
    title: result.title,
    year: result.year,
    thumb: result.thumb || undefined,
    credit: searchParams.credit || undefined,
    song: searchParams.song || undefined,
  }
}

function buildSearchParams(
  searchParams: { [key: string]: string },
  result: SearchResult
) {
  const params = new URLSearchParams()

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })

  if (result.type === "release") {
    params.set("kind", "release")
  }

  return params.toString()
}

function PaginationSummary({
  resultsCount,
  pagination,
}: {
  resultsCount: number
  pagination: {
    page: number
    totalItems: number
  }
}) {
  const { t, formatNumber: formatCount } = useI18n()
  const totalItems = Math.max(pagination.totalItems, resultsCount)

  if (pagination.page === 1 && totalItems === resultsCount) {
    return null
  }

  return (
    <HStack justify="space-between" align="center" mb={3} spacing={3}>
      <Text color="text.muted" fontSize="sm">
        {t("results.showing", {
          count: formatCount(resultsCount),
          total: formatCount(totalItems),
        })}
      </Text>
      {pagination.page > 1 ? (
        <Badge colorScheme="blue" textTransform="none">
          {t("results.pagesLoaded", { count: pagination.page })}
        </Badge>
      ) : null}
    </HStack>
  )
}

function PaginationFooter({
  pagination,
}: {
  pagination: {
    page: number
    totalPages: number
    totalItems: number
    reachedPageLimit: boolean
    nextPageHref: string
  }
}) {
  const { t, formatNumber: formatCount } = useI18n()
  const hasNextPage =
    pagination.page < pagination.totalPages && !pagination.reachedPageLimit

  if (!hasNextPage && !pagination.reachedPageLimit) {
    return null
  }

  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      mt={4}
      p={3}
      textAlign="center"
    >
      {hasNextPage ? (
        <Button
          as={Link}
          to={pagination.nextPageHref}
          colorScheme="blue"
          leftIcon={<AppIcon name="search" size={15} />}
          variant="outline"
        >
          {t("results.loadMore")}
        </Button>
      ) : (
        <Text color="text.muted" fontSize="sm">
          {t("results.pageLimit", { total: formatCount(pagination.totalItems) })}
        </Text>
      )}
    </Box>
  )
}

function buildSearchSummary(
  searchParams: { [key: string]: string },
  t: Translate
) {
  const criteria = [
    searchParams.credit ? t("results.empty.credit", { value: searchParams.credit }) : "",
    searchParams.song ? t("results.empty.song", { value: searchParams.song }) : "",
    searchParams.genre ? t("results.empty.genre", { value: searchParams.genre }) : "",
  ].filter(Boolean)

  return criteria.length > 0 ? criteria.join(", ") : t("results.empty.thisSearch")
}

function buildRelaxedSearchLinks(
  searchParams: { [key: string]: string },
  t: Translate
) {
  return [
    { key: "credit", label: t("results.empty.removeCredit") },
    { key: "song", label: t("results.empty.removeSong") },
    { key: "genre", label: t("results.empty.removeGenre") },
  ]
    .filter((item) => searchParams[item.key])
    .map((item) => ({
      label: item.label,
      to: buildRelaxedSearchHref(searchParams, item.key),
    }))
}

function buildRelaxedSearchHref(
  searchParams: { [key: string]: string },
  omittedKey: string
) {
  const nextParams = new URLSearchParams()

  Object.entries(searchParams).forEach(([key, value]) => {
    if (key !== omittedKey && key !== "page" && value) {
      nextParams.set(key, value)
    }
  })

  if (
    !nextParams.get("credit") &&
    !nextParams.get("song") &&
    !nextParams.get("genre")
  ) {
    nextParams.delete("role")
  }

  const queryString = nextParams.toString()
  return queryString ? `/search?${queryString}` : "/search"
}

function buildSummary(result: SearchResult) {
  return [result.year, result.country, firstValue(result.label), result.catno]
    .filter(Boolean)
    .join(" / ")
}

function buildTags(result: SearchResult) {
  return [
    firstValue(result.format),
    firstValue(result.genre),
    firstValue(result.style),
  ].filter((tag): tag is string => Boolean(tag))
}

function firstValue(values?: string[]) {
  return values?.find(Boolean)
}
