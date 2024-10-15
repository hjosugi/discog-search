import { useLoaderData, Link } from "@remix-run/react"
import { discogsFetch } from "~/utils/discogsAuthMiddleware"
import {
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
  const { album, q } = useLoaderData<{
    album: any
    q: string
  }>()

  return (
    <VStack spacing={2} p={1} align="center" w="full" maxH="90vh" mt="5%">
      <Box w="full">
        <HStack
          spacing={6}
          align="start"
          w="full"
          justify="center"
          flexWrap="wrap"
        >
          <Image
            src={album.images[0].uri}
            alt={album.title}
            boxSize={{ base: "25%" }}
            objectFit="cover"
            borderRadius="md"
          />

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
    </VStack>
  )
}
