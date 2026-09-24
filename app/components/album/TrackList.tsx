import { Box, HStack, Text, VStack } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import { AppIcon } from "../AppIcon"
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
    <VStack
      align="stretch"
      spacing={1}
      maxH={{ base: "none", lg: "58vh" }}
      overflowY={{ base: "visible", lg: "auto" }}
    >
      {tracks.map((track) => {
        const isSelected = track.position === selectedPosition

        return (
          <Box
            key={`${track.position}-${track.title}`}
            as={RouterLink}
            to={buildDetailHref(location, { track: track.position })}
            preventScrollReset
            aria-current={isSelected ? "true" : undefined}
            p={2}
            minH="44px"
            borderRadius="md"
            bg={isSelected ? "bg.selected" : "transparent"}
            borderWidth="1px"
            borderColor={isSelected ? "border.selected" : "transparent"}
            _hover={{ bg: isSelected ? "bg.selected" : "bg.subtle" }}
          >
            <HStack justify="space-between" align="start">
              <Box>
                <HStack spacing={1.5}>
                  {isSelected && (
                    <Box as="span" color="text.accent" flexShrink={0}>
                      <AppIcon name="play" size={12} fill="currentColor" strokeWidth={0} />
                    </Box>
                  )}
                  <Text fontSize="sm" fontWeight={isSelected ? "bold" : "normal"}>
                    {track.title}
                  </Text>
                </HStack>
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
