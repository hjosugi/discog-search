import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Image,
  Stack,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react"

import { AppIcon } from "../AppIcon"
import type { TrackItem } from "~/types"
import { buildStreamingLinks } from "~/utils/streaming"

export function AlbumHeader({
  title,
  artistName,
  year,
  coverImage,
  discogsUri,
  playQuery,
  selectedTrack,
  performerSummary,
}: {
  title: string
  artistName: string
  year?: number
  coverImage?: string
  discogsUri?: string
  playQuery: string
  selectedTrack?: TrackItem
  performerSummary: string
}) {
  return (
    <Stack
      direction={{ base: "column", md: "row" }}
      spacing={{ base: 4, md: 6 }}
      align="start"
    >
      {coverImage ? (
        <Image
          src={coverImage}
          alt={title}
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
              {title}
            </Heading>
          </HStack>
          <Text color="text.muted" fontSize="sm">
            {artistName}
            {year ? ` / ${year}` : ""}
          </Text>
        </Box>

        {selectedTrack && (
          <SelectedTrackCard
            track={selectedTrack}
            performerSummary={performerSummary}
          />
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
          {discogsUri && (
            <WrapItem>
              <Button
                as="a"
                href={discogsUri}
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
  )
}

function SelectedTrackCard({
  track,
  performerSummary,
}: {
  track: TrackItem
  performerSummary: string
}) {
  return (
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
            {track.title}
          </Heading>
          <Text fontSize="sm" color="text.muted">
            {track.position}
            {track.duration ? ` / ${track.duration}` : ""}
          </Text>
        </Box>
        <Badge colorScheme="blue">{performerSummary}</Badge>
      </HStack>
    </Box>
  )
}
