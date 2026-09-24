import { Badge, Box, HStack, Link, Text, VStack } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import { AppIcon } from "../AppIcon"
import { useI18n } from "~/i18n/I18nProvider"
import { buildCreditSearchPath } from "~/utils/albumDetail"
import {
  creditMatchesPerson,
  dedupeCredits,
  type Credit,
} from "~/utils/trackCredits"

export function CreditList({
  credits,
  emptyText,
  highlightPerson,
}: {
  credits: Credit[]
  emptyText?: string
  /** Emphasizes the credits of the person the user searched for. */
  highlightPerson?: string
}) {
  const { t } = useI18n()

  if (credits.length === 0) {
    return (
      <Text color="text.muted" fontSize="sm">
        {emptyText || t("album.noCredits")}
      </Text>
    )
  }

  return (
    <VStack align="stretch" spacing={2}>
      {dedupeCredits(credits).map((credit) => (
        <CreditCard
          key={`${credit.name}-${credit.role}-${credit.tracks}-${credit.source}`}
          credit={credit}
          isHighlighted={Boolean(
            highlightPerson && creditMatchesPerson(credit, highlightPerson)
          )}
        />
      ))}
    </VStack>
  )
}

function CreditCard({
  credit,
  isHighlighted,
}: {
  credit: Credit
  isHighlighted: boolean
}) {
  const { t } = useI18n()

  return (
    <Box
      p={3}
      borderWidth="1px"
      borderColor={isHighlighted ? "border.selected" : "border.default"}
      borderRadius="md"
      bg={isHighlighted ? "bg.accent" : "bg.subtle"}
      data-highlighted={isHighlighted || undefined}
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
            ? t("album.source.track")
            : credit.isGlobal
              ? t("album.source.album")
              : t("album.source.range")}
        </Badge>
      </HStack>
    </Box>
  )
}
