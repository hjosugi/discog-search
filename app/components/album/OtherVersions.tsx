import {
  Badge,
  Box,
  Button,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react"
import { Link as RouterLink, useFetcher } from "react-router"

import { AppIcon } from "../AppIcon"
import { SectionTitle } from "./SectionTitle"
import type { MasterVersionsLoaderData } from "~/routes/masters.versions"
import type { MasterVersion } from "~/types"
import { buildVersionHref } from "~/utils/albumDetail"
import { foldText } from "~/utils/text"

/**
 * Lists the other releases (country / year / format / label) under the
 * album's Discogs master. Choosing one opens the same detail page for that
 * release, keeping the search context but not the selected track, because
 * track positions differ between pressings.
 */
export function OtherVersions({
  masterId,
  currentReleaseId,
  backQuery,
}: {
  masterId: number
  currentReleaseId: number
  backQuery: string
}) {
  const fetcher = useFetcher<MasterVersionsLoaderData>()
  const [loaded, setLoaded] = useState<{
    masterId: number
    versions: MasterVersion[]
    page: number
    totalPages: number
    totalItems: number
  } | null>(null)
  const [filter, setFilter] = useState("")
  const { load } = fetcher
  const data = fetcher.data

  useEffect(() => {
    load(`/masters/${masterId}/versions`)
  }, [load, masterId])

  useEffect(() => {
    if (!data?.ok || Number(data.masterId) !== masterId) return

    setLoaded((current) => {
      const previous =
        current?.masterId === masterId && data.pagination.page > 1
          ? current.versions
          : []
      const seen = new Set(previous.map((version) => version.id))
      return {
        masterId,
        versions: [
          ...previous,
          ...data.versions.filter((version) => !seen.has(version.id)),
        ],
        page: data.pagination.page,
        totalPages: data.pagination.totalPages,
        totalItems: data.pagination.totalItems,
      }
    })
  }, [data, masterId])

  const current = loaded?.masterId === masterId ? loaded : null
  const visibleVersions = useMemo(() => {
    const query = foldText(filter)
    if (!current || !query) return current?.versions || []
    return current.versions.filter((version) =>
      foldText(describeVersion(version)).includes(query)
    )
  }, [current, filter])
  const isLoading = fetcher.state === "loading"
  const errorMessage = data && !data.ok ? data.errorMessage : ""

  return (
    <Box as="section" aria-labelledby="other-versions-heading">
      <SectionTitle id="other-versions-heading">
        Other versions
        {current ? ` (${current.totalItems.toLocaleString()})` : ""}
      </SectionTitle>

      {current && current.versions.length > 8 && (
        <InputGroup size="sm" mb={3} maxW="320px">
          <InputLeftElement color="text.icon">
            <AppIcon name="search" size={14} />
          </InputLeftElement>
          <Input
            aria-label="Filter versions by country, year, format, or label"
            placeholder="Filter: Japan, CD, 1977..."
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            bg="bg.surface"
          />
        </InputGroup>
      )}

      {!current && isLoading && (
        <VStack align="stretch" spacing={2}>
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} h="44px" borderRadius="md" />
          ))}
        </VStack>
      )}

      {errorMessage && !current && (
        <Text color="text.muted" fontSize="sm">
          {errorMessage}
        </Text>
      )}

      {current && (
        <VStack as="ul" listStyleType="none" align="stretch" spacing={1}>
          {visibleVersions.map((version) => (
            <VersionRow
              key={version.id}
              version={version}
              isCurrent={version.id === currentReleaseId}
              href={buildVersionHref(version.id, backQuery)}
            />
          ))}
          {visibleVersions.length === 0 && (
            <Text as="li" color="text.muted" fontSize="sm">
              No versions match this filter.
            </Text>
          )}
        </VStack>
      )}

      {current && current.page < current.totalPages && (
        <Button
          mt={3}
          size="sm"
          variant="outline"
          isLoading={isLoading}
          onClick={() =>
            load(`/masters/${masterId}/versions?page=${current.page + 1}`)
          }
        >
          Load more versions
        </Button>
      )}
    </Box>
  )
}

function VersionRow({
  version,
  isCurrent,
  href,
}: {
  version: MasterVersion
  isCurrent: boolean
  href: string
}) {
  const year = getReleaseYear(version.released)
  const labelText = [version.label, version.catno].filter(Boolean).join(" ")

  return (
    <Box as="li">
      <Link
        as={RouterLink}
        to={href}
        aria-current={isCurrent ? "page" : undefined}
        display="block"
        px={3}
        py={2}
        borderRadius="md"
        borderWidth="1px"
        borderColor={isCurrent ? "border.selected" : "transparent"}
        bg={isCurrent ? "bg.selected" : "transparent"}
        _hover={{ bg: isCurrent ? "bg.selected" : "bg.subtle", textDecoration: "none" }}
      >
        <HStack justify="space-between" align="start" spacing={3}>
          <Box minW={0}>
            <HStack spacing={2} flexWrap="wrap">
              <Text fontSize="sm" fontWeight="semibold">
                {[year, version.country].filter(Boolean).join(" · ") ||
                  "Unknown year"}
              </Text>
              {isCurrent && (
                <Badge colorScheme="blue" textTransform="none">
                  Current
                </Badge>
              )}
            </HStack>
            <Text fontSize="sm" color="text.secondary" noOfLines={1}>
              {version.format || version.major_formats?.join(", ") || version.title}
            </Text>
            {labelText && (
              <Text fontSize="xs" color="text.muted" noOfLines={1}>
                {labelText}
              </Text>
            )}
          </Box>
          <Text color="text.icon" flexShrink={0} mt={1}>
            <AppIcon name="disc" size={15} />
          </Text>
        </HStack>
      </Link>
    </Box>
  )
}

function getReleaseYear(released?: string) {
  const match = released?.match(/^\d{4}/)
  return match ? match[0] : ""
}

function describeVersion(version: MasterVersion) {
  return [
    version.released,
    version.country,
    version.format,
    version.major_formats?.join(" "),
    version.label,
    version.catno,
  ]
    .filter(Boolean)
    .join(" ")
}
