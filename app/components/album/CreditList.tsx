import { Badge, Box, HStack, Link, Text, VStack } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import { AppIcon } from "../AppIcon"
import { buildCreditSearchPath } from "~/utils/albumDetail"
import { dedupeCredits, type Credit } from "~/utils/trackCredits"

export function CreditList({
  credits,
  emptyText,
}: {
  credits: Credit[]
  emptyText?: string
}) {
  if (credits.length === 0) {
    return (
      <Text color="text.muted" fontSize="sm">
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
          borderColor="border.default"
          borderRadius="md"
          bg="bg.subtle"
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
