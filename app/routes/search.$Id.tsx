import { useMemo, useState } from "react"
import { useLoaderData, Link } from "@remix-run/react"
import { discogsFetch } from "~/utils/discogsAuthMiddleware"
import {
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

export async function loader({
  params,
  request,
}: {
  params: { Id: string }
  request: Request
}) {
  const url = new URL(request.url)
  const searchParams = new URLSearchParams(url.search)
  const q = searchParams.toString()
  const albumId = params.Id
  const track = searchParams.get("track")

  if (!albumId) {
    throw new Response("Album ID is required", { status: 400 })
  }

  try {
    const albumData = await discogsFetch(`masters/${albumId}`)
    return { album: albumData, track, q }
  } catch (error) {
    console.error("Failed to fetch album data:", error)
    throw new Response("Failed to fetch album data", { status: 500 })
  }
}

export default function AlbumView() {
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

  return (
    <VStack spacing={4} p={{ base: 4, md: 8 }} align="stretch" maxW="1000px" mx="auto">
      <HStack spacing={6} align="start" flexWrap="wrap">
        {album.images?.[0]?.uri && (
          <Image
            src={album.images[0].uri}
            alt={album.title}
            boxSize={{ base: "140px", md: "220px" }}
            objectFit="cover"
            borderRadius="lg"
          />
        )}

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
    </VStack>
  )
}
