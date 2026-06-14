import { useMemo, type ReactNode } from "react"
import {
  isRouteErrorResponse,
  Link as RemixLink,
  useLoaderData,
  useRouteError,
} from "@remix-run/react"
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
  DiscogsFetchError,
  discogsFetch,
} from "~/utils/discogsAuthMiddleware"
import {
  DiscogsMaster,
  DiscogsRelease,
  DiscogsVideo,
  ExtraArtist,
  TrackItem,
} from "~/types"

type Credit = ExtraArtist & {
  source: "track" | "release"
  isGlobal: boolean
}

type LoaderData = {
  master: DiscogsMaster
  release: DiscogsRelease
  selectedTrackPosition: string | null
  searchQuery: string
  backQuery: string
  detailId: string
  detailKind: "master" | "release"
}

type RateLimitedResponse = {
  rateLimited?: boolean
}

const PERFORMANCE_ROLE_PATTERNS = [
  "drum",
  "percussion",
  "bass",
  "guitar",
  "vocal",
  "voice",
  "piano",
  "keyboard",
  "synth",
  "organ",
  "sax",
  "flute",
  "trumpet",
  "trombone",
  "horn",
  "violin",
  "viola",
  "cello",
  "strings",
  "performer",
]

export async function loader({
  params,
  request,
}: {
  params: { Id: string }
  request: Request
}) {
  const url = new URL(request.url)
  const searchParams = new URLSearchParams(url.search)
  const albumId = params.Id
  const resultKind = searchParams.get("kind") === "release" ? "release" : "master"
  const requestedTrack = searchParams.get("track")
  const searchQuery = searchParams.get("song") || searchParams.get("q") || ""

  if (!albumId) {
    throw new Response("Album ID is required", { status: 400 })
  }

  try {
    const release =
      resultKind === "release" ? await fetchDiscogsRelease(albumId) : null
    const master = release
      ? release.master_id
        ? await fetchDiscogsMaster(release.master_id)
        : (release as DiscogsMaster)
      : await fetchDiscogsMaster(albumId)
    const resolvedRelease =
      release ||
      (master.main_release
        ? await fetchDiscogsRelease(master.main_release)
        : (master as DiscogsRelease))
    const selectedTrackPosition =
      requestedTrack ||
      findBestTrackMatch(resolvedRelease.tracklist || master.tracklist || [], searchQuery)
        ?.position ||
      null

    return {
      master,
      release: resolvedRelease,
      selectedTrackPosition,
      searchQuery,
      backQuery: searchParams.toString(),
      detailId: albumId,
      detailKind: resultKind,
    }
  } catch (error) {
    if (error instanceof Response) {
      throw error
    }
    if (error instanceof DiscogsFetchError) {
      if (!isExpectedDiscogsAlbumError(error)) {
        console.error("Failed to fetch album data:", error)
      }
      throw new Response(getAlbumErrorMessage(error), {
        status: error.status,
      })
    }

    console.error("Failed to fetch album data:", error)
    throw new Response("Failed to fetch album data", { status: 500 })
  }
}

export function ErrorBoundary() {
  const error = useRouteError()
  const status = isRouteErrorResponse(error) ? error.status : 500
  const message = isRouteErrorResponse(error)
    ? String(error.data)
    : "Could not load album details."

  return (
    <Box
      minH="100vh"
      bg="gray.50"
      px={{ base: 4, md: 6 }}
      py={{ base: 5, md: 8 }}
    >
      <Box
        maxW="760px"
        mx="auto"
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={5}
      >
        <HStack spacing={2} mb={2}>
          <Text color="blue.600">
            <AppIcon name="disc" size={18} />
          </Text>
          <Heading as="h1" size="md">
            Album details unavailable
          </Heading>
        </HStack>
        <Text color="gray.600" fontSize="sm" mb={4}>
          {status} / {message}
        </Text>
        <Button
          as={RemixLink}
          to="/search"
          leftIcon={<AppIcon name="arrowLeft" size={15} />}
          variant="link"
        >
          Back to Search
        </Button>
      </Box>
    </Box>
  )
}

async function fetchDiscogsMaster(id: string | number) {
  const response = await discogsFetch<DiscogsMaster | RateLimitedResponse>(
    `masters/${id}`
  )
  if (isRateLimitedResponse(response)) {
    throw new Response("Discogs is cooling down after rate limiting.", {
      status: 429,
    })
  }
  return response
}

async function fetchDiscogsRelease(id: string | number) {
  const response = await discogsFetch<DiscogsRelease | RateLimitedResponse>(
    `releases/${id}`
  )
  if (isRateLimitedResponse(response)) {
    throw new Response("Discogs is cooling down after rate limiting.", {
      status: 429,
    })
  }
  return response
}

function isRateLimitedResponse(
  response: DiscogsMaster | DiscogsRelease | RateLimitedResponse
): response is RateLimitedResponse {
  return Boolean("rateLimited" in response && response.rateLimited)
}

function isExpectedDiscogsAlbumError(error: DiscogsFetchError) {
  return (
    error.status === 401 ||
    error.status === 403 ||
    error.status === 404 ||
    error.status === 429
  )
}

function getAlbumErrorMessage(error: DiscogsFetchError) {
  if (error.status === 401 || error.status === 403) {
    return "Discogs rejected the request. Check DISCOGS_TOKEN, then restart the dev server."
  }
  if (error.status === 404) {
    return "This Discogs item could not be found."
  }
  if (error.status === 429) {
    return "Discogs rate limit was reached. Please wait a moment and try again."
  }
  return "Failed to fetch album data."
}

export default function AlbumView() {
  const {
    master,
    release,
    selectedTrackPosition,
    searchQuery,
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
  const otherCredits = selectedCredits.filter(
    (credit) => !isPerformanceRole(credit.role)
  )
  const artistName =
    release.artists_sort ||
    release.artists?.map((artist) => artist.name).join(", ") ||
    master.artists?.map((artist) => artist.name).join(", ") ||
    ""
  const playQuery = [artistName, selectedTrack?.title || release.title]
    .filter(Boolean)
    .join(" ")
  const videos = getMatchingVideos(release.videos || [], selectedTrack?.title)
  const coverImage = getCoverImage(release, master) || undefined

  return (
    <Box
      minH="100vh"
      bg="gray.50"
      px={{ base: 4, md: 6 }}
      py={{ base: 5, md: 8 }}
    >
      <Box maxW="1040px" mx="auto">
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
            <Box boxSize={{ base: "150px", md: "190px" }} bg="gray.100" />
          )}

          <VStack align="stretch" spacing={4} flex="1">
            <Box>
              <HStack align="center" spacing={2} mb={1}>
                <Text color="gray.500">
                  <AppIcon name="disc" size={18} />
                </Text>
                <Heading as="h1" size={{ base: "md", md: "lg" }}>
                  {release.title}
                </Heading>
              </HStack>
              <Text color="gray.600" fontSize="sm">
                {artistName}
                {release.year ? ` / ${release.year}` : ""}
              </Text>
            </Box>

            {selectedTrack && (
              <Box
                bg="white"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
                p={3}
              >
                <HStack color="gray.600" fontSize="xs" mb={1} spacing={1}>
                  <AppIcon name="music" size={14} />
                  <Text>Selected Track</Text>
                </HStack>
                <HStack justify="space-between" align="start" flexWrap="wrap" gap={2}>
                  <Box>
                    <Heading as="h2" size="md">
                      {selectedTrack.title}
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      {selectedTrack.position}
                      {selectedTrack.duration ? ` / ${selectedTrack.duration}` : ""}
                    </Text>
                  </Box>
                  <Badge colorScheme="blue">
                    {performanceCredits.length} performers
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
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
          >
            <SectionTitle>Performers</SectionTitle>
            <CreditList
              credits={performanceCredits}
              emptyText="No performer credits were found for this track."
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
                      color="blue.600"
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
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
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
                    as={RemixLink}
                    to={`/search/${detailId}?${params.toString()}`}
                    p={2}
                    borderRadius="md"
                    bg={isSelected ? "blue.50" : "transparent"}
                    borderWidth="1px"
                    borderColor={isSelected ? "blue.200" : "transparent"}
                    _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
                  >
                    <HStack justify="space-between" align="start">
                      <Box>
                        <Text
                          fontSize="sm"
                          fontWeight={isSelected ? "bold" : "normal"}
                        >
                          {track.title}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {track.position}
                        </Text>
                      </Box>
                      {track.duration && (
                        <Text fontSize="xs" color="gray.600">
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
          as={RemixLink}
          to={`/search${backQuery ? `?${backQuery}` : ""}`}
          leftIcon={<AppIcon name="arrowLeft" size={15} />}
          variant="link"
        >
          Back to List
        </Button>
      </Box>
    </Box>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <HStack spacing={2} mb={3}>
      <Text color="blue.600">
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
      <Text color="gray.600" fontSize="sm">
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
          borderColor="gray.200"
          borderRadius="md"
          bg="gray.50"
        >
          <HStack justify="space-between" align="start" spacing={3}>
            <HStack align="start" spacing={2}>
              <Text color="gray.500" mt="2px">
                <AppIcon name="user" size={15} />
              </Text>
              <Box>
                <Text fontWeight="bold">{credit.name}</Text>
                <Text fontSize="sm" color="gray.700">
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

function findBestTrackMatch(tracks: TrackItem[], query: string) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return null

  return (
    tracks.find((track) => normalize(track.title) === normalizedQuery) ||
    tracks.find((track) => normalize(track.title).includes(normalizedQuery)) ||
    tracks.find((track) => normalizedQuery.includes(normalize(track.title))) ||
    null
  )
}

function getTrackCredits(
  selectedTrack: TrackItem | undefined,
  tracks: TrackItem[],
  releaseCredits: ExtraArtist[] = []
) {
  if (!selectedTrack) return []

  const directCredits = (selectedTrack.extraartists || []).map((artist) => ({
    ...artist,
    source: "track" as const,
    isGlobal: false,
  }))
  const releaseLevelCredits = releaseCredits
    .filter((artist) => creditAppliesToTrack(artist.tracks, selectedTrack, tracks))
    .map((artist) => ({
      ...artist,
      source: "release" as const,
      isGlobal: !artist.tracks,
    }))

  return [...directCredits, ...releaseLevelCredits]
}

function creditAppliesToTrack(
  creditTracks: string | undefined,
  selectedTrack: TrackItem,
  tracks: TrackItem[]
) {
  if (!creditTracks) return true

  const position = normalizePosition(selectedTrack.position)
  const allPositions = tracks.map((track) => normalizePosition(track.position))
  const segments = creditTracks.split(",").map((segment) => segment.trim())

  return segments.some((segment) => {
    const normalizedSegment = normalizePosition(segment)
    if (normalizedSegment === position) return true
    if (!/\bto\b/i.test(segment) && !segment.includes("-")) return false

    const [start, end] = segment
      .split(/\s+to\s+|-/i)
      .map((value) => normalizePosition(value))
    const startIndex = allPositions.indexOf(start)
    const endIndex = allPositions.indexOf(end)
    const targetIndex = allPositions.indexOf(position)

    return (
      startIndex >= 0 &&
      endIndex >= 0 &&
      targetIndex >= Math.min(startIndex, endIndex) &&
      targetIndex <= Math.max(startIndex, endIndex)
    )
  })
}

function isPerformanceRole(role: string) {
  const normalizedRole = role.toLowerCase()
  return PERFORMANCE_ROLE_PATTERNS.some((pattern) =>
    normalizedRole.includes(pattern)
  )
}

function dedupeCredits(credits: Credit[]) {
  const seen = new Set<string>()
  return credits.filter((credit) => {
    const key = `${normalize(credit.name)}-${normalize(credit.role)}-${credit.source}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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

function getCoverImage(release: DiscogsRelease, master: DiscogsMaster) {
  return release.images?.[0]?.uri || master.images?.[0]?.uri || null
}

function normalize(value = "") {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function normalizePosition(value: string) {
  return value.toUpperCase().replace(/\s+/g, "")
}
