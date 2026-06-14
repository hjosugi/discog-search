<<<<<<< HEAD
import { useMemo } from "react"
import { useLoaderData, Link as RemixLink } from "@remix-run/react"
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
||||||| e3e4796
import { useLoaderData, Link } from "@remix-run/react"
=======
import { useMemo, useState } from "react"
import { useLoaderData, Link } from "@remix-run/react"
>>>>>>> origin/codex/add-musician-information-feature
import { discogsFetch } from "~/utils/discogsAuthMiddleware"
import {
<<<<<<< HEAD
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
||||||| e3e4796
  Box,
  Heading,
  Text,
  Image,
  VStack,
  HStack,
  Button,
} from "@chakra-ui/react"
import { TrackItem } from "~/types"
import { fontFace } from "@fluentui/react"
=======
  Badge,
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Image,
  Input,
  Link as ChakraLink,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { AlbumArtist, DiscogsMaster, ExtraArtist, TrackItem } from "~/types"

type Credit = ExtraArtist & {
  normalizedRole: string
  trackTitles: string[]
}

const PLAYER_ROLE_KEYWORDS = [
  "drum",
  "percussion",
  "bass",
  "guitar",
  "piano",
  "keyboard",
  "synth",
  "vocal",
  "sax",
  "trumpet",
  "trombone",
  "violin",
  "cello",
  "producer",
  "arranged",
  "conductor",
]

function normalize(value = "") {
  return value.toLowerCase().replace(/\[[^\]]*\]/g, "").trim()
}

function trackPositions(trackRefs = "") {
  return trackRefs
    .split(",")
    .map((track) => track.trim())
    .filter(Boolean)
}

function isTrackMatch(credit: ExtraArtist, track: TrackItem) {
  const positions = trackPositions(credit.tracks)

  if (positions.length === 0) {
    return true
  }

  return positions.some((position) => {
    const [start, end] = position.split(" to ").map((item) => item.trim())
    if (end) {
      return track.position >= start && track.position <= end
    }
    return position === track.position
  })
}

function buildCredits(extraartists: ExtraArtist[] = [], tracks: TrackItem[] = []) {
  return extraartists.map((artist) => ({
    ...artist,
    normalizedRole: normalize(artist.role),
    trackTitles: tracks
      .filter((track) => isTrackMatch(artist, track))
      .map((track) => `${track.position} ${track.title}`),
  }))
}

function buildServiceLinks(album: DiscogsMaster, selectedTrackTitle?: string | null) {
  const artist = album.artists?.map((item) => item.name).join(" ") || ""
  const title = selectedTrackTitle || album.title
  const query = encodeURIComponent(`${artist} ${title}`.replace(/\s+/g, " ").trim())

  return [
    {
      label: "Apple Music",
      href: `https://music.apple.com/us/search?term=${query}`,
    },
    { label: "Spotify", href: `https://open.spotify.com/search/${query}` },
    { label: "YouTube Music", href: `https://music.youtube.com/search?q=${query}` },
    { label: "Amazon Music", href: `https://music.amazon.com/search/${query}` },
  ]
}
>>>>>>> origin/codex/add-musician-information-feature

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
  const requestedTrack = searchParams.get("track")
  const searchQuery = searchParams.get("q") || ""

  if (!albumId) {
    throw new Response("Album ID is required", { status: 400 })
  }

  try {
    const master = (await discogsFetch(`masters/${albumId}`)) as DiscogsMaster
    const release = master.main_release
      ? ((await discogsFetch(`releases/${master.main_release}`)) as DiscogsRelease)
      : (master as DiscogsRelease)

    const selectedTrackPosition =
      requestedTrack ||
      findBestTrackMatch(release.tracklist || master.tracklist || [], searchQuery)
        ?.position ||
      null

    return {
      master,
      release,
      selectedTrackPosition,
      searchQuery,
      backQuery: searchParams.toString(),
    }
  } catch (error) {
    console.error("Failed to fetch album data:", error)
    throw new Response("Failed to fetch album data", { status: 500 })
  }
}

export default function AlbumView() {
<<<<<<< HEAD
  const { master, release, selectedTrackPosition, searchQuery, backQuery } =
    useLoaderData<LoaderData>()
  const tracks = release.tracklist || master.tracklist || []
  const selectedTrack = useMemo(
    () =>
      tracks.find((track) => track.position === selectedTrackPosition) ||
      findBestTrackMatch(tracks, searchQuery) ||
      tracks[0],
    [searchQuery, selectedTrackPosition, tracks]
  )
  const selectedCredits = getTrackCredits(selectedTrack, tracks, release.extraartists)
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
||||||| e3e4796
  const { album, q } = useLoaderData<{
    album: any
    q: string
  }>()
=======
  const { album, q, track } = useLoaderData<{
    album: DiscogsMaster
    q: string
    track: string | null
  }>()
  const [selectedTrack, setSelectedTrack] = useState(track || "")
  const [roleFilter, setRoleFilter] = useState("drum")

  const selectedTrackItem = album.tracklist?.find(
    (trackItem: TrackItem) => trackItem.position === selectedTrack
  )
  const credits = useMemo(
    () => buildCredits(album.extraartists, album.tracklist),
    [album.extraartists, album.tracklist]
  )
  const visibleCredits = credits.filter((credit: Credit) => {
    const matchesTrack = selectedTrackItem ? isTrackMatch(credit, selectedTrackItem) : true
    const matchesRole = roleFilter
      ? credit.normalizedRole.includes(normalize(roleFilter)) ||
        normalize(credit.name).includes(normalize(roleFilter))
      : PLAYER_ROLE_KEYWORDS.some((keyword) => credit.normalizedRole.includes(keyword))

    return matchesTrack && matchesRole
  })
  const serviceLinks = buildServiceLinks(album, selectedTrackItem?.title)
>>>>>>> origin/codex/add-musician-information-feature

  return (
<<<<<<< HEAD
    <Box p={{ base: 4, md: 6 }} maxW="1040px" mx="auto">
      <Stack
        direction={{ base: "column", md: "row" }}
        spacing={{ base: 4, md: 6 }}
        align="start"
      >
        {coverImage ? (
||||||| e3e4796
    <VStack spacing={2} p={1} align="center" w="full" maxH="90vh" mt="5%">
      <Box w="full">
        <HStack
          spacing={6}
          align="start"
          w="full"
          justify="center"
          flexWrap="wrap"
        >
=======
    <VStack spacing={4} p={{ base: 4, md: 8 }} align="stretch" maxW="1000px" mx="auto">
      <HStack spacing={6} align="start" flexWrap="wrap">
        {album.images?.[0]?.uri && (
>>>>>>> origin/codex/add-musician-information-feature
          <Image
<<<<<<< HEAD
            src={coverImage}
            alt={release.title}
            boxSize={{ base: "150px", md: "190px" }}
||||||| e3e4796
            src={album.images[0].uri}
            alt={album.title}
            boxSize={{ base: "25%" }}
=======
            src={album.images[0].uri}
            alt={album.title}
            boxSize={{ base: "140px", md: "220px" }}
>>>>>>> origin/codex/add-musician-information-feature
            objectFit="cover"
            borderRadius="lg"
          />
<<<<<<< HEAD
        ) : (
          <Box boxSize={{ base: "150px", md: "190px" }} bg="gray.100" />
||||||| e3e4796
=======
>>>>>>> origin/codex/add-musician-information-feature
        )}

<<<<<<< HEAD
        <VStack align="stretch" spacing={3} flex="1">
          <Box>
            <Heading as="h1" size={{ base: "md", md: "lg" }}>
              {release.title}
            </Heading>
            <Text color="gray.600" fontSize="sm">
              {artistName}
              {release.year ? ` / ${release.year}` : ""}
            </Text>
          </Box>

          {selectedTrack && (
            <Box bg="gray.50" borderRadius="md" p={3}>
              <Text fontSize="xs" color="gray.600" mb={1}>
                選択中の曲
              </Text>
              <HStack justify="space-between" align="start">
                <Box>
                  <Heading as="h2" size="md">
                    {selectedTrack.title}
                  </Heading>
                  <Text fontSize="sm" color="gray.600">
                    {selectedTrack.position}
                    {selectedTrack.duration ? ` / ${selectedTrack.duration}` : ""}
                  </Text>
                </Box>
                <Badge colorScheme="blue">{performanceCredits.length} players</Badge>
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
                  size="sm"
                >
                  Discogs
                </Button>
              </WrapItem>
            )}
          </Wrap>
        </VStack>
      </Stack>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mt={6}>
        <Box>
          <SectionTitle>演奏者</SectionTitle>
          <CreditList
            credits={performanceCredits}
            emptyText="この曲に紐づく演奏クレジットは見つかりませんでした。"
          />

          {otherCredits.length > 0 && (
            <Box mt={5}>
              <SectionTitle>その他のクレジット</SectionTitle>
              <CreditList credits={otherCredits} />
            </Box>
          )}

          {videos.length > 0 && (
            <Box mt={5}>
              <SectionTitle>動画</SectionTitle>
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

        <Box>
          <SectionTitle>トラック</SectionTitle>
          <VStack align="stretch" spacing={1} maxH="58vh" overflowY="auto">
            {tracks.map((track) => {
              const isSelected = track.position === selectedTrack?.position
              const params = new URLSearchParams(backQuery)
              params.set("track", track.position)

              return (
                <Box
                  key={`${track.position}-${track.title}`}
                  as={RemixLink}
                  to={`/search/${master.id}?${params.toString()}`}
                  p={2}
                  borderRadius="md"
                  bg={isSelected ? "blue.50" : "transparent"}
                  borderWidth="1px"
                  borderColor={isSelected ? "blue.200" : "transparent"}
                  _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
                >
                  <HStack justify="space-between" align="start">
                    <Box>
                      <Text fontSize="sm" fontWeight={isSelected ? "bold" : "normal"}>
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
      <Button as={RemixLink} to={`/search${backQuery ? `?${backQuery}` : ""}`} variant="link">
        Back to List
      </Button>
    </Box>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Heading as="h2" size="sm" mb={3}>
      {children}
    </Heading>
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
        {emptyText || "該当するクレジットはありません。"}
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
        >
          <HStack justify="space-between" align="start" spacing={3}>
            <Box>
              <Text fontWeight="bold">{credit.name}</Text>
              <Text fontSize="sm" color="gray.700">
                {credit.role}
              </Text>
            </Box>
            <Badge colorScheme={credit.source === "track" ? "green" : "gray"}>
              {credit.source === "track" ? "track" : credit.isGlobal ? "album" : "range"}
            </Badge>
          </HStack>
        </Box>
      ))}
||||||| e3e4796
          <VStack align="flex-start" spacing={2} maxW="lg" ml={1}>
            <Heading as="h1" size={{ base: "sm", md: "md" }} fontWeight="bold">
              {album.title}
            </Heading>
            <Text fontSize={{ base: "xs", md: "sm" }}>
              <strong>Year: </strong> {album.year}
            </Text>

            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold">
              Artist:{" "}
              {album.artists.map((artist: any) => (
                <Text
                  as="span"
                  key={artist.id}
                  fontSize={{ base: "xs", md: "sm" }}
                  fontWeight="normal"
                >
                  {artist.name}{" "}
                </Text>
              ))}
            </Text>

            {album.extraartists?.length > 0 && (
              <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold">
                Personnels:{" "}
                {album.extraartists.map((extraArtist: any) => (
                  <Text as="span" key={extraArtist.id}>
                    {extraArtist.name}
                  </Text>
                ))}
              </Text>
            )}

            <Link
              target="_blank"
              to={`https://www.discogs.com/master/${album.id}`}
            >
              <Button colorScheme="blue" variant="link">
                Discogs
              </Button>
            </Link>
          </VStack>
        </HStack>
      </Box>
      <VStack
        h={{ base: "50vh", md: "50vh" }}
        overflowY="auto"
        w={{ base: "80%", md: "60%" }}
        pl="12%"
        pr="10%"
      >
        {album.tracklist.map((trackItem: TrackItem, index: number) => (
          <Box key={index} w="full" p={1} _hover={{ bg: "gray.50" }}>
            <HStack justify="space-between" w="full">
              <Text fontSize={{ base: "xs", md: "md" }}>{trackItem.title}</Text>
              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">
                {trackItem.duration}
              </Text>
            </HStack>
          </Box>
        ))}
      </VStack>
      <Link to={`/search?${q}`}>
        <Button
          colorScheme="blue"
          size={{ base: "md", md: "lg" }}
          variant="link"
        >
          Back to List
        </Button>
      </Link>
=======
        <VStack align="flex-start" spacing={3} flex="1" minW="260px">
          <Heading as="h1" size={{ base: "md", md: "lg" }}>
            {album.title}
          </Heading>
          <Text>
            <strong>Artist:</strong>{" "}
            {album.artists?.map((artist: AlbumArtist) => artist.name).join(", ")}
          </Text>
          {album.year && <Text><strong>Year:</strong> {album.year}</Text>}
          <HStack wrap="wrap">
            <ChakraLink href={`https://www.discogs.com/master/${album.id}`} isExternal>
              <Button colorScheme="blue" variant="outline" size="sm">Discogs</Button>
            </ChakraLink>
            {serviceLinks.map((service) => (
              <ChakraLink key={service.label} href={service.href} isExternal>
                <Button colorScheme="green" size="sm">{service.label}</Button>
              </ChakraLink>
            ))}
          </HStack>
        </VStack>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Box borderWidth="1px" borderRadius="lg" p={4}>
          <Heading as="h2" size="sm" mb={3}>曲を選ぶ</Heading>
          <VStack align="stretch" maxH="420px" overflowY="auto" spacing={2}>
            {album.tracklist?.map((trackItem: TrackItem) => (
              <Button
                key={`${trackItem.position}-${trackItem.title}`}
                justifyContent="space-between"
                variant={selectedTrack === trackItem.position ? "solid" : "ghost"}
                colorScheme={selectedTrack === trackItem.position ? "blue" : "gray"}
                onClick={() => setSelectedTrack(trackItem.position)}
              >
                <Text as="span" noOfLines={1}>{trackItem.position} {trackItem.title}</Text>
                <Text as="span" fontSize="xs">{trackItem.duration}</Text>
              </Button>
            ))}
          </VStack>
        </Box>

        <Box borderWidth="1px" borderRadius="lg" p={4}>
          <Heading as="h2" size="sm" mb={2}>演奏者・クレジット</Heading>
          <Text fontSize="sm" color="gray.600" mb={3}>
            例: drum / bass / guitar / vocal。空欄にすると演奏系ロールをまとめて表示します。
          </Text>
          <Input
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            placeholder="ロールや名前で絞り込み"
            size="sm"
            mb={3}
          />
          <VStack align="stretch" maxH="420px" overflowY="auto" divider={<Divider />}>
            {visibleCredits.length > 0 ? (
              visibleCredits.map((credit: Credit) => (
                <Box key={`${credit.id}-${credit.name}-${credit.role}`} py={2}>
                  <HStack wrap="wrap" mb={1}>
                    <Text fontWeight="bold">{credit.name}</Text>
                    <Badge colorScheme="purple">{credit.role}</Badge>
                  </HStack>
                  {credit.trackTitles.length > 0 && (
                    <Text fontSize="xs" color="gray.600" noOfLines={2}>
                      {credit.trackTitles.join(", ")}
                    </Text>
                  )}
                </Box>
              ))
            ) : (
              <Text color="gray.500">条件に合うクレジットが見つかりません。</Text>
            )}
          </VStack>
        </Box>
      </SimpleGrid>

      <Link to={`/search?${q}`}>
        <Button colorScheme="blue" variant="link">Back to List</Button>
      </Link>
>>>>>>> origin/codex/add-musician-information-feature
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
  creditTracks: string,
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

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function normalizePosition(value: string) {
  return value.toUpperCase().replace(/\s+/g, "")
}
