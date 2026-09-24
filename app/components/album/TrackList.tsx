import { Box, HStack, Text, VStack } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import type { TrackItem } from "~/types"
import { buildDetailHref, type DetailLocation } from "~/utils/albumDetail"

export function TrackList({
  location,
  tracks,
  selectedPosition,
}: {
  location: DetailLocation
  tracks: TrackItem[]
  selectedPosition?: string
}) {
  return (
    <VStack align="stretch" spacing={1} maxH="58vh" overflowY="auto">
      {tracks.map((track) => {
        const isSelected = track.position === selectedPosition

        return (
          <Box
            key={`${track.position}-${track.title}`}
            as={RouterLink}
            to={buildDetailHref(location, { track: track.position })}
            p={2}
            borderRadius="md"
            bg={isSelected ? "bg.selected" : "transparent"}
            borderWidth="1px"
            borderColor={isSelected ? "border.selected" : "transparent"}
            _hover={{ bg: isSelected ? "bg.selected" : "bg.subtle" }}
          >
            <HStack justify="space-between" align="start">
              <Box>
                <Text fontSize="sm" fontWeight={isSelected ? "bold" : "normal"}>
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
  )
}
