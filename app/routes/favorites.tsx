import {
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import { AppIcon } from "../components/AppIcon"
import { useFavorites } from "../hooks/useFavorites"
import { buildFavoriteHref, type FavoriteAlbum } from "../utils/favorites"
import { buildPageMeta } from "../utils/pageMeta"

export function meta() {
  return buildPageMeta({
    title: "Favorites | Sideman Album Finder",
    description: "Albums you saved while digging through Discogs credits.",
  })
}

export default function FavoritesPage() {
  const { entries, removeFavorite, clearFavorites } = useFavorites()

  return (
    <Box maxW="980px" mx="auto">
      <HStack justify="space-between" align="center" mb={5} spacing={3}>
        <HStack spacing={3}>
          <Text color="text.accent">
            <AppIcon name="star" size={20} />
          </Text>
          <Box>
            <Heading as="h1" size="md">
              Favorites
            </Heading>
            <Text fontSize="sm" color="text.muted">
              {entries.length === 1 ? "1 saved album" : `${entries.length} saved albums`}
            </Text>
          </Box>
        </HStack>
        {entries.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearFavorites}>
            Clear all
          </Button>
        )}
      </HStack>

      {entries.length === 0 ? (
        <EmptyFavorites />
      ) : (
        <VStack as="ul" listStyleType="none" align="stretch" spacing={3}>
          {entries.map((entry) => (
            <FavoriteCard
              key={`${entry.kind}:${entry.id}`}
              entry={entry}
              onRemove={() => removeFavorite(entry)}
            />
          ))}
        </VStack>
      )}
    </Box>
  )
}

function FavoriteCard({
  entry,
  onRemove,
}: {
  entry: FavoriteAlbum
  onRemove: () => void
}) {
  const details = [entry.artist, entry.year].filter(Boolean).join(" / ")
  const memo = [
    entry.credit ? `credit: ${entry.credit}` : "",
    entry.song ? `song: ${entry.song}` : "",
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Box
      as="li"
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      display="flex"
      alignItems="flex-start"
      _hover={{ borderColor: "border.hover", boxShadow: "sm" }}
    >
      <Box flex="1" minW={0}>
        <RouterLink to={buildFavoriteHref(entry)}>
          <HStack align="start" spacing={3} p={3}>
            {entry.thumb ? (
              <Image
                src={entry.thumb}
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
            <Box minW={0}>
              <Text fontSize="md" fontWeight="semibold" noOfLines={2}>
                {entry.title}
              </Text>
              {details && (
                <Text fontSize="sm" color="text.muted" noOfLines={1}>
                  {details}
                </Text>
              )}
              {memo && (
                <HStack color="text.muted" spacing={1} mt={1}>
                  <AppIcon name="search" size={13} />
                  <Text fontSize="sm" noOfLines={1}>
                    {memo}
                  </Text>
                </HStack>
              )}
              <Text fontSize="xs" color="text.subtle" mt={1}>
                Saved {new Date(entry.savedAt).toLocaleDateString()}
              </Text>
            </Box>
          </HStack>
        </RouterLink>
      </Box>
      <IconButton
        aria-label={`Remove ${entry.title} from favorites`}
        icon={<AppIcon name="x" size={16} />}
        onClick={onRemove}
        size="sm"
        variant="ghost"
        flexShrink={0}
        mt={2}
        mr={2}
      />
    </Box>
  )
}

function EmptyFavorites() {
  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      p={{ base: 4, md: 5 }}
    >
      <Heading as="h2" size="sm">
        No favorites yet
      </Heading>
      <Text color="text.muted" fontSize="sm" mt={1}>
        Use the star on a search result or album page to save it here.
      </Text>
      <Button
        as={RouterLink}
        to="/search"
        mt={4}
        size="sm"
        colorScheme="blue"
        leftIcon={<AppIcon name="search" size={15} />}
      >
        Search albums
      </Button>
    </Box>
  )
}
