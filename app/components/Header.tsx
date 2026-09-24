import {
  Badge,
  Box,
  Button,
  Container,
  HStack,
  Link,
  Text,
} from "@chakra-ui/react"
import { Link as RouterLink, NavLink } from "react-router"

import { AppIcon } from "./AppIcon"
import { useFavorites } from "../hooks/useFavorites"

export function Header() {
  const { entries } = useFavorites()

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
            aria-label="Sideman Album Finder home"
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
                  Sideman Album Finder
                </Text>
                <Text color="text.muted" fontSize="xs">
                  Discogs credits search
                </Text>
              </Box>
            </HStack>
          </Link>

          <HStack as="nav" aria-label="Main" spacing={1}>
            <Button
              as={NavLink}
              to="/favorites"
              size="sm"
              variant="ghost"
              leftIcon={<AppIcon name="star" size={15} />}
              _activeLink={{ bg: "bg.selected", color: "text.link" }}
            >
              Favorites
              {entries.length > 0 && (
                <Badge ml={2} colorScheme="yellow" borderRadius="full">
                  {entries.length}
                </Badge>
              )}
            </Button>
          </HStack>
        </HStack>
      </Container>
    </Box>
  )
}
