import {
  Badge,
  Box,
  Button,
  Container,
  HStack,
  Link,
  Select,
  Text,
} from "@chakra-ui/react"
import { Link as RouterLink, NavLink } from "react-router"

import { AppIcon } from "./AppIcon"
import { ColorModeMenu } from "./ColorModeMenu"
import { useFavorites } from "../hooks/useFavorites"
import { useI18n } from "../i18n/I18nProvider"
import { isLocale } from "../i18n/locale"

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
] as const

export function Header() {
  const { entries } = useFavorites()
  const { locale, setLocale, t } = useI18n()

  return (
    <Box
      as="header"
      bg="bg.surface"
      borderBottomWidth="1px"
      borderColor="border.default"
    >
      <Container maxW="1100px" px={{ base: 4, md: 6 }} py={3}>
        <HStack justify="space-between" spacing={3}>
          <Link
            as={RouterLink}
            to="/search"
            _hover={{ textDecoration: "none" }}
            aria-label={t("app.home")}
          >
            <HStack spacing={3}>
              <Box
                alignItems="center"
                bg="logo.bg"
                borderRadius="md"
                color="logo.fg"
                display="flex"
                h="40px"
                justifyContent="center"
                w="40px"
                flexShrink={0}
              >
                <AppIcon name="disc" size={22} />
              </Box>
              <Box>
                <Text color="text.default" fontSize="md" fontWeight="bold">
                  {t("app.name")}
                </Text>
                <Text color="text.muted" fontSize="xs">
                  {t("app.tagline")}
                </Text>
              </Box>
            </HStack>
          </Link>

          <HStack as="nav" aria-label={t("nav.main")} spacing={1}>
            <Button
              as={NavLink}
              to="/favorites"
              size="sm"
              variant="ghost"
              leftIcon={<AppIcon name="star" size={15} />}
              _activeLink={{ bg: "bg.selected", color: "text.link" }}
            >
              {t("nav.favorites")}
              {entries.length > 0 && (
                <Badge ml={2} colorScheme="yellow" borderRadius="full">
                  {entries.length}
                </Badge>
              )}
            </Button>
            <Select
              aria-label={t("nav.language")}
              value={locale}
              onChange={(event) => {
                if (isLocale(event.target.value)) setLocale(event.target.value)
              }}
              size="sm"
              variant="filled"
              w="auto"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} lang={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <ColorModeMenu />
          </HStack>
        </HStack>
      </Container>
    </Box>
  )
}
