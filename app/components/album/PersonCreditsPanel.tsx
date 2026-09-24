import {
  Box,
  Button,
  Heading,
  HStack,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import { Link as RouterLink } from "react-router"

import { AppIcon } from "../AppIcon"
import { useI18n } from "~/i18n/I18nProvider"
import { buildDetailHref, type DetailLocation } from "~/utils/albumDetail"
import type { PersonAlbumCredits } from "~/utils/trackCredits"

const COLLAPSED_ROWS = 8

/**
 * "Where does this person play on this album?" — shown at the top of the
 * detail page when it was opened from a credit search. Each row switches the
 * selected track below.
 */
export function PersonCreditsPanel({
  person,
  credits,
  totalTracks,
  selectedPosition,
  location,
}: {
  person: string
  credits: PersonAlbumCredits | null
  totalTracks: number
  selectedPosition?: string
  location: DetailLocation
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { t } = useI18n()
  const rows = credits?.tracks || []
  const visibleRows = isExpanded ? rows : rows.slice(0, COLLAPSED_ROWS)

  return (
    <Box
      as="section"
      aria-labelledby="person-credits-heading"
      bg="bg.accent"
      borderWidth="1px"
      borderColor="border.selected"
      borderRadius="md"
      p={4}
      mb={5}
    >
      <HStack spacing={2} mb={1}>
        <Text color="text.accent">
          <AppIcon name="user" size={16} />
        </Text>
        <Heading as="h2" size="sm" id="person-credits-heading">
          {t("album.person.title", { person })}
        </Heading>
      </HStack>
      <Text color="text.muted" fontSize="sm" mb={credits ? 3 : 0}>
        {credits
          ? `${t("album.person.summary", {
              count: rows.length,
              total: totalTracks,
            })}${
              credits.albumRoles.length > 0
                ? t("album.person.albumRoles", {
                    roles: credits.albumRoles.join(", "),
                  })
                : ""
            }`
          : t("album.person.none", { person })}
      </Text>

      {rows.length > 0 && (
        <VStack as="ol" listStyleType="none" align="stretch" spacing={1}>
          {visibleRows.map(({ track, roles }) => {
            const isSelected = track.position === selectedPosition

            return (
              <Box as="li" key={`${track.position}-${track.title}`}>
                <Link
                  as={RouterLink}
                  to={buildDetailHref(location, { track: track.position })}
                  preventScrollReset
                  aria-current={isSelected ? "true" : undefined}
                  minH="44px"
                  display="flex"
                  gap={3}
                  alignItems="center"
                  px={2}
                  py={1.5}
                  borderRadius="md"
                  bg={isSelected ? "bg.surface" : "transparent"}
                  fontWeight={isSelected ? "semibold" : "normal"}
                  _hover={{ bg: "bg.surface", textDecoration: "none" }}
                >
                  <Text as="span" fontSize="xs" color="text.muted" minW="2.5em">
                    {track.position}
                  </Text>
                  <Text as="span" fontSize="sm" flex="1" minW={0} noOfLines={1}>
                    {track.title}
                  </Text>
                  <Text as="span" fontSize="sm" color="text.secondary" textAlign="right">
                    {roles.join(", ")}
                  </Text>
                </Link>
              </Box>
            )
          })}
        </VStack>
      )}

      {rows.length > COLLAPSED_ROWS && (
        <Button
          mt={2}
          size="xs"
          minH={{ base: "44px", md: 6 }}
          variant="ghost"
          onClick={() => setIsExpanded((value) => !value)}
          aria-expanded={isExpanded}
        >
          {isExpanded
            ? t("album.person.showFewer")
            : t("album.person.showAll", { count: rows.length })}
        </Button>
      )}
    </Box>
  )
}
