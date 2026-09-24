import {
  Box,
  Container,
  HStack,
  Link,
  Text,
} from "@chakra-ui/react"

import { AppIcon } from "./AppIcon"
import { useI18n } from "../i18n/I18nProvider"

export function Footer() {
  const { t } = useI18n()

  return (
    <Box
      as="footer"
      bg="bg.surface"
      borderTopWidth="1px"
      borderColor="border.default"
    >
      <Container maxW="1100px" px={{ base: 4, md: 6 }} py={4}>
        <HStack
          align="center"
          color="text.muted"
          flexWrap="wrap"
          fontSize="sm"
          justify="space-between"
          spacing={3}
        >
          <Text>
            {t("footer.dataBy")}{" "}
            <Link
              href="https://www.discogs.com/"
              color="text.link"
              fontWeight="semibold"
              isExternal
            >
              Discogs
            </Link>
            .
          </Text>
          <Link
            href="https://github.com/hjosugi/discog-search"
            color="text.link"
            fontWeight="semibold"
            isExternal
          >
            <HStack as="span" spacing={1}>
              <AppIcon name="external" size={14} />
              <Text as="span">{t("footer.github")}</Text>
            </HStack>
          </Link>
        </HStack>
      </Container>
    </Box>
  )
}
