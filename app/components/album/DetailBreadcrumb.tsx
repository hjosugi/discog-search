import { HStack, Link, Text } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import { useI18n } from "~/i18n/I18nProvider"
import { buildSearchListHref } from "~/utils/albumDetail"

export function DetailBreadcrumb({
  albumTitle,
  backQuery,
}: {
  albumTitle: string
  backQuery: string
}) {
  const { t } = useI18n()

  return (
    <HStack
      as="nav"
      aria-label={t("album.breadcrumb")}
      color="text.muted"
      fontSize="sm"
      mb={4}
      spacing={2}
    >
      <Link
        as={RouterLink}
        to={buildSearchListHref(backQuery)}
        color="text.link"
        fontWeight="semibold"
        _hover={{ color: "text.linkHover", textDecoration: "underline" }}
      >
        {t("album.breadcrumb.search")}
      </Link>
      <Text aria-hidden="true">&gt;</Text>
      <Text aria-current="page" color="text.secondary" noOfLines={1}>
        {albumTitle}
      </Text>
    </HStack>
  )
}
