import { Box, Button, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import { AppIcon } from "../AppIcon"
import {
  buildSearchHistoryHref,
  buildSearchHistorySummary,
  type SearchHistoryEntry,
} from "~/hooks/useSearchHistory"
import { useI18n } from "~/i18n/I18nProvider"

export function SearchHistoryPanel({
  entries,
  onClear,
  onRemove,
}: {
  entries: SearchHistoryEntry[]
  onClear: () => void
  onRemove: (id: string) => void
}) {
  const { t } = useI18n()

  if (entries.length === 0) return null

  return (
    <Box
      as="section"
      aria-labelledby="recent-searches-heading"
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      boxShadow="sm"
      mt={3}
      p={3}
    >
      <HStack justify="space-between" mb={2} spacing={3}>
        <HStack color="text.secondary" spacing={2}>
          <AppIcon name="clock" size={15} />
          <Heading as="h2" fontSize="sm" fontWeight="semibold" id="recent-searches-heading">
            {t("history.title")}
          </Heading>
        </HStack>
        <Button size="xs" variant="ghost" onClick={onClear}>
          {t("history.clear")}
        </Button>
      </HStack>
      <VStack as="ul" listStyleType="none" align="stretch" spacing={1}>
        {entries.map((entry, index) => {
          const summary = buildSearchHistorySummary(entry, t)

          return (
            <HStack as="li" key={entry.id} spacing={2}>
              <Button
                as={RouterLink}
                to={buildSearchHistoryHref(entry)}
                justifyContent="flex-start"
                leftIcon={<AppIcon name="search" size={14} />}
                minW={0}
                size="sm"
                variant="ghost"
                whiteSpace="normal"
                w="100%"
              >
                <Text as="span" noOfLines={1}>
                  {summary}
                </Text>
              </Button>
              <Button
                aria-label={t("history.delete", { index: index + 1 })}
                flexShrink={0}
                onClick={() => onRemove(entry.id)}
                size="sm"
                variant="ghost"
              >
                <AppIcon name="x" size={14} />
              </Button>
            </HStack>
          )
        })}
      </VStack>
    </Box>
  )
}
