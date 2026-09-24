import { HStack, Link, Text } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import { buildSearchListHref } from "~/utils/albumDetail"

export function DetailBreadcrumb({
  albumTitle,
  backQuery,
}: {
  albumTitle: string
  backQuery: string
}) {
  return (
    <HStack
      as="nav"
      aria-label="Breadcrumb"
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
        Search
      </Link>
      <Text aria-hidden="true">&gt;</Text>
      <Text aria-current="page" color="text.secondary" noOfLines={1}>
        {albumTitle}
      </Text>
    </HStack>
  )
}
