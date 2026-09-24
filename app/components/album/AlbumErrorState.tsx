import { Box, Button, Heading, HStack, Text } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import { AppIcon } from "../AppIcon"
import { useI18n } from "~/i18n/I18nProvider"

export function AlbumErrorState({
  status,
  message,
}: {
  status: number
  message: string
}) {
  const { t } = useI18n()

  return (
    <Box
      maxW="760px"
      mx="auto"
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="md"
      p={5}
    >
      <HStack spacing={2} mb={2}>
        <Text color="text.accent">
          <AppIcon name="disc" size={18} />
        </Text>
        <Heading as="h1" size="md">
          {t("album.error.title")}
        </Heading>
      </HStack>
      <Text color="text.muted" fontSize="sm" mb={4}>
        {status} / {message}
      </Text>
      <Button
        as={RouterLink}
        to="/search"
        leftIcon={<AppIcon name="arrowLeft" size={15} />}
        variant="link"
      >
        {t("album.error.back")}
      </Button>
    </Box>
  )
}
