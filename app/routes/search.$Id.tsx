import { useMemo, type ReactNode } from "react"
import {
  isRouteErrorResponse,
  Link as RouterLink,
  useLoaderData,
  useRouteError,
} from "react-router"
import {
  Badge,
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Image,
  Link,
  SimpleGrid,
  Stack,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react"

import { AppIcon } from "~/components/AppIcon"
import {
  DiscogsMaster,
  DiscogsRelease,
  DiscogsVideo,
} from "~/types"
import { api, getApiErrorMessage, toQueryObject } from "~/utils/apiClient"
import {
  buildPageMeta,
  compactText,
} from "~/utils/pageMeta"
import {
  dedupeCredits,
  filterCreditsByRole,
  findBestTrackMatch,
  getRoleFilterOptions,
  getTrackCredits,
  isPerformanceRole,
  roleMatchesFilter,
  type Credit,
} from "~/utils/trackCredits"

type LoaderData = {
  master: DiscogsMaster
  release: DiscogsRelease
  selectedTrackPosition: string | null
  searchQuery: string
  roleFilter: string
  backQuery: string
  detailId: string
  detailKind: "master" | "release"
}

export async function clientLoader({
  params,
  request,
}: {
  params: { Id: string }
  request: Request
}) {
  const url = new URL(request.url)
  const albumId = params.Id

  if (!albumId) {
    throw new Response("Album ID is required", { status: 400 })
  }

  const response = await api.api.releases({ id: albumId }).get({
    query: toQueryObject(url.searchParams),
  })

  if (response.error) {
    throw new Response(
      getApiErrorMessage(response.error, "Failed to fetch album data."),
      { status: response.status }
    )
  }

  const data = response.data as unknown as LoaderData | null

  if (!data) {
    throw new Response("Failed to fetch album data.", {
      status: 500,
    })
  }

  return data
}

type AlbumMetaArgs = {
  data?: LoaderData
}

export function meta({ data }: AlbumMetaArgs) {
  if (!data) {
    return buildPageMeta({
      title: "Album details | Sideman Album Finder",
      description: "Explore Discogs album credits, track performers, and release details.",
    })
  }

  const { master, release, searchQuery, selectedTrackPosition } = data
  const artistName = getArtistName(release, master)
  const title = `${release.title}${artistName ? ` by ${artistName}` : ""} | Sideman Album Finder`
  const tracks = release.tracklist || master.tracklist || []
  const selectedTrack =
    tracks.find((track) => track.position === selectedTrackPosition) ||
    findBestTrackMatch(tracks, searchQuery) ||
    tracks[0]
  const trackText = selectedTrack
    ? ` Track focus: ${selectedTrack.title}.`
    : ""
  const description = `${artistName ? `${artistName} - ` : ""}${release.title}${release.year ? ` (${release.year})` : ""}. Explore Discogs performers, credits, tracks, and source release links.${trackText}`

  return buildPageMeta({
    title: compactText(title, 90),
    description: compactText(description),
    image: getCoverImage(release, master) || "/logo-dark.png",
    type: "music.album",
  })
}

export function ErrorBoundary() {
  const error = useRouteError()
  const status = isRouteErrorResponse(error) ? error.status : 500
  const message = isRouteErrorResponse(error)
    ? String(error.data)
    : "Could not load album details."

  return (
    <Box
      maxW="760px"
      mx="auto"
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      p={5}
    >
      <HStack spacing={2} mb={2}>
        <Text color="text.accent">
          <AppIcon name="disc" size={18} />
        </Text>
        <Heading as="h1" size="md">
          Album details unavailable
        </Heading>
      </HStack>
      <Text color="text.muted" fontSize="sm" mb={4}>
        {status} / {message}
      </Text>
      <Button
        as={RouterLink}
        to="/search"
        leftIcon={<AppIcon name="arrowLeft" size={15} />}
        variant="link"
      >
        Back to Search
      </Button>
    </Box>
  )
}

export default function AlbumView() {
  const {
    master,
    release,
    selectedTrackPosition,
    searchQuery,
    roleFilter,
    backQuery,
    detailId,
    detailKind,
  } = useLoaderData<LoaderData>()
  const tracks = useMemo(
    () => release.tracklist || master.tracklist || [],
    [master.tracklist, release.tracklist]
  )
  const selectedTrack = useMemo(
    () =>
      tracks.find((track) => track.position === selectedTrackPosition) ||
      findBestTrackMatch(tracks, searchQuery) ||
      tracks[0],
    [searchQuery, selectedTrackPosition, tracks]
  )
  const selectedCredits = getTrackCredits(
    selectedTrack,
    tracks,
    release.extraartists
  )
  const performanceCredits = selectedCredits.filter((credit) =>
    isPerformanceRole(credit.role)
  )
  const roleOptions = getRoleFilterOptions(performanceCredits)
  const visiblePerformanceCredits = filterCreditsByRole(
    performanceCredits,
    roleFilter
  )
  const otherCredits = selectedCredits.filter(
    (credit) => !isPerformanceRole(credit.role)
  )
  const artistName = getArtistName(release, master)
  const playQuery = buildPlaybackQuery(
    artistName,
    selectedTrack?.title || release.title
  )
  const videos = getMatchingVideos(release.videos || [], selectedTrack?.title)
  const coverImage = getCoverImage(release, master) || undefined

  return (
    <Box maxW="1040px" mx="auto">
        <DetailBreadcrumb
          albumTitle={release.title}
          backQuery={backQuery}
        />
        <Stack
          direction={{ base: "column", md: "row" }}
          spacing={{ base: 4, md: 6 }}
          align="start"
        >
          {coverImage ? (
            <Image
              src={coverImage}
              alt={release.title}
              boxSize={{ base: "150px", md: "190px" }}
              objectFit="cover"
              borderRadius="md"
            />
          ) : (
            <Box boxSize={{ base: "150px", md: "190px" }} bg="bg.muted" />
          )}

          <VStack align="stretch" spacing={4} flex="1">
            <Box>
              <HStack align="center" spacing={2} mb={1}>
                <Text color="text.subtle">
                  <AppIcon name="disc" size={18} />
                </Text>
                <Heading as="h1" size={{ base: "md", md: "lg" }}>
                  {release.title}
                </Heading>
              </HStack>
              <Text color="text.muted" fontSize="sm">
                {artistName}
                {release.year ? ` / ${release.year}` : ""}
              </Text>
            </Box>

            {selectedTrack && (
              <Box
                bg="bg.surface"
                borderRadius="md"
                borderWidth="1px"
                borderColor="border.default"
                p={3}
              >
                <HStack color="text.muted" fontSize="xs" mb={1} spacing={1}>
                  <AppIcon name="music" size={14} />
                  <Text>Selected Track</Text>
                </HStack>
                <HStack justify="space-between" align="start" flexWrap="wrap" gap={2}>
                  <Box>
                    <Heading as="h2" size="md">
                      {selectedTrack.title}
                    </Heading>
                    <Text fontSize="sm" color="text.muted">
                      {selectedTrack.position}
                      {selectedTrack.duration ? ` / ${selectedTrack.duration}` : ""}
                    </Text>
                  </Box>
                  <Badge colorScheme="blue">
                    {roleFilter
                      ? `${visiblePerformanceCredits.length}/${performanceCredits.length} performers`
                      : `${performanceCredits.length} performers`}
                  </Badge>
                </HStack>
              </Box>
            )}

            <Wrap spacing={2}>
              {buildStreamingLinks(playQuery).map((service) => (
                <WrapItem key={service.label}>
                  <Button
                    as="a"
                    href={service.href}
                    target="_blank"
                    rel="noreferrer"
                    colorScheme={service.colorScheme}
                    leftIcon={<AppIcon name="music" size={15} />}
                    size="sm"
                  >
                    {service.label}
                  </Button>
                </WrapItem>
              ))}
              {release.uri && (
                <WrapItem>
                  <Button
                    as="a"
                    href={release.uri}
                    target="_blank"
                    rel="noreferrer"
                    variant="outline"
                    leftIcon={<AppIcon name="external" size={15} />}
                    size="sm"
                  >
                    Discogs
                  </Button>
                </WrapItem>
              )}
            </Wrap>
          </VStack>
        </Stack>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5} mt={6}>
          <Box
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="md"
            p={4}
          >
            <SectionTitle>Performers</SectionTitle>
            <RoleFilterLinks
              detailId={detailId}
              detailKind={detailKind}
              backQuery={backQuery}
              activeRole={roleFilter}
              roles={roleOptions}
            />
            <CreditList
              credits={visiblePerformanceCredits}
              emptyText={
                roleFilter
                  ? `No ${roleFilter} credits were found for this track.`
                  : "No performer credits were found for this track."
              }
            />

            {otherCredits.length > 0 && (
              <Box mt={5}>
                <SectionTitle>Credits</SectionTitle>
                <CreditList credits={otherCredits} />
              </Box>
            )}

            {videos.length > 0 && (
              <Box mt={5}>
                <SectionTitle>Videos</SectionTitle>
                <VStack align="stretch" spacing={2}>
                  {videos.map((video) => (
                    <Link
                      key={video.uri}
                      href={video.uri}
                      target="_blank"
                      rel="noreferrer"
                      color="text.accent"
                      fontSize="sm"
                    >
                      {video.title}
                    </Link>
                  ))}
                </VStack>
              </Box>
            )}
          </Box>

          <Box
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="md"
            p={4}
          >
            <SectionTitle>Tracks</SectionTitle>
            <VStack align="stretch" spacing={1} maxH="58vh" overflowY="auto">
              {tracks.map((track) => {
                const isSelected = track.position === selectedTrack?.position
                const params = new URLSearchParams(backQuery)
                params.set("track", track.position)
                if (detailKind === "release") params.set("kind", "release")

                return (
                  <Box
                    key={`${track.position}-${track.title}`}
                    as={RouterLink}
                    to={`/search/${detailId}?${params.toString()}`}
                    p={2}
                    borderRadius="md"
                    bg={isSelected ? "bg.selected" : "transparent"}
                    borderWidth="1px"
                    borderColor={isSelected ? "border.selected" : "transparent"}
                    _hover={{ bg: isSelected ? "bg.selected" : "bg.subtle" }}
                  >
                    <HStack justify="space-between" align="start">
                      <Box>
                        <Text
                          fontSize="sm"
                          fontWeight={isSelected ? "bold" : "normal"}
                        >
                          {track.title}
                        </Text>
                        <Text fontSize="xs" color="text.muted">
                          {track.position}
                        </Text>
                      </Box>
                      {track.duration && (
                        <Text fontSize="xs" color="text.muted">
                          {track.duration}
                        </Text>
                      )}
                    </HStack>
                  </Box>
                )
              })}
            </VStack>
          </Box>
        </SimpleGrid>

        <Divider my={6} />
        <Button
          as={RouterLink}
          to={`/search${backQuery ? `?${backQuery}` : ""}`}
          leftIcon={<AppIcon name="arrowLeft" size={15} />}
          variant="link"
        >
          Back to List
        </Button>
    </Box>
  )
}

function DetailBreadcrumb({
  albumTitle,
  backQuery,
}: {
  albumTitle: string
  backQuery: string
}) {
  return (
    <HStack
      as="nav"
      aria-label="Breadcrumb"
      color="text.muted"
      fontSize="sm"
      mb={4}
      spacing={2}
    >
      <Link
        as={RouterLink}
        to={`/search${backQuery ? `?${backQuery}` : ""}`}
        color="text.link"
        fontWeight="semibold"
        _hover={{ color: "text.linkHover", textDecoration: "underline" }}
      >
        Search
      </Link>
      <Text aria-hidden="true">&gt;</Text>
      <Text aria-current="page" color="text.secondary" noOfLines={1}>
        {albumTitle}
      </Text>
    </HStack>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <HStack spacing={2} mb={3}>
      <Text color="text.accent">
        <AppIcon name="spark" size={15} />
      </Text>
      <Heading as="h2" size="sm">
        {children}
      </Heading>
    </HStack>
  )
}

function CreditList({
  credits,
  emptyText,
}: {
  credits: Credit[]
  emptyText?: string
}) {
  if (credits.length === 0) {
    return (
      <Text color="text.muted" fontSize="sm">
        {emptyText || "No matching credits were found."}
      </Text>
    )
  }

  return (
    <VStack align="stretch" spacing={2}>
      {dedupeCredits(credits).map((credit) => (
        <Box
          key={`${credit.name}-${credit.role}-${credit.tracks}-${credit.source}`}
          p={3}
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="md"
          bg="bg.subtle"
        >
          <HStack justify="space-between" align="start" spacing={3}>
            <HStack align="start" spacing={2}>
              <Text color="text.subtle" mt="2px">
                <AppIcon name="user" size={15} />
              </Text>
              <Box>
                <Link
                  as={RouterLink}
                  to={buildCreditSearchPath(credit.name)}
                  color="text.link"
                  fontWeight="bold"
                  _hover={{ color: "text.linkHover", textDecoration: "underline" }}
                >
                  {credit.name}
                </Link>
                <Text fontSize="sm" color="text.secondary">
                  {credit.role}
                </Text>
              </Box>
            </HStack>
            <Badge
              colorScheme={credit.source === "track" ? "green" : "gray"}
              textTransform="none"
            >
              {credit.source === "track"
                ? "track"
                : credit.isGlobal
                  ? "album"
                  : "range"}
            </Badge>
          </HStack>
        </Box>
      ))}
    </VStack>
  )
}

function RoleFilterLinks({
  detailId,
  detailKind,
  backQuery,
  activeRole,
  roles,
}: {
  detailId: string
  detailKind: "master" | "release"
  backQuery: string
  activeRole: string
  roles: string[]
}) {
  if (roles.length === 0 && !activeRole) {
    return null
  }

  return (
    <Wrap spacing={2} mb={3}>
      {roles.map((role) => {
        const params = new URLSearchParams(backQuery)
        params.set("role", role)
        if (detailKind === "release") params.set("kind", "release")
        const isActive =
          Boolean(activeRole) && roleMatchesFilter(role, activeRole)

        return (
          <WrapItem key={role}>
            <Button
              as={RouterLink}
              to={`/search/${detailId}?${params.toString()}`}
              colorScheme={isActive ? "blue" : "gray"}
              size="xs"
              variant={isActive ? "solid" : "outline"}
            >
              {role}
            </Button>
          </WrapItem>
        )
      })}
      {activeRole && (
        <WrapItem>
          <Button
            as={RouterLink}
            to={`/search/${detailId}?${clearRoleFilter(backQuery, detailKind)}`}
            size="xs"
            variant="ghost"
          >
            Clear
          </Button>
        </WrapItem>
      )}
    </Wrap>
  )
}

function buildCreditSearchPath(name: string) {
  const params = new URLSearchParams({ credit: name })
  return `/search?${params.toString()}`
}

function getMatchingVideos(videos: DiscogsVideo[], trackTitle?: string) {
  if (!trackTitle) return videos.slice(0, 3)

  const matchedVideos = videos.filter((video) =>
    normalize(video.title).includes(normalize(trackTitle))
  )
  return (matchedVideos.length > 0 ? matchedVideos : videos).slice(0, 3)
}

function buildStreamingLinks(query: string) {
  const encoded = encodeURIComponent(query)
  return [
    {
      label: "Apple Music",
      href: `https://music.apple.com/us/search?term=${encoded}`,
      colorScheme: "red",
    },
    {
      label: "Spotify",
      href: `https://open.spotify.com/search/${encoded}`,
      colorScheme: "green",
    },
    {
      label: "YouTube Music",
      href: `https://music.youtube.com/search?q=${encoded}`,
      colorScheme: "red",
    },
  ]
}

function buildPlaybackQuery(artistName: string, trackTitle: string) {
  return [getPrimaryArtistName(artistName), cleanSearchText(trackTitle)]
    .filter(Boolean)
    .join(" ")
}

function getPrimaryArtistName(artistName: string) {
  return cleanSearchText(artistName.split(/,|\/|;|\s+-\s+/)[0] || artistName)
}

function cleanSearchText(value: string) {
  return value
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function clearRoleFilter(
  backQuery: string,
  detailKind: "master" | "release"
) {
  const params = new URLSearchParams(backQuery)
  params.delete("role")
  if (detailKind === "release") params.set("kind", "release")
  return params.toString()
}

function getCoverImage(release: DiscogsRelease, master: DiscogsMaster) {
  return release.images?.[0]?.uri || master.images?.[0]?.uri || null
}

function getArtistName(release: DiscogsRelease, master: DiscogsMaster) {
  return (
    release.artists_sort ||
    release.artists?.map((artist) => artist.name).join(", ") ||
    master.artists?.map((artist) => artist.name).join(", ") ||
    ""
  )
}

function normalize(value = "") {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}
