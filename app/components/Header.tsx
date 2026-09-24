import {
  Box,
  Container,
  HStack,
  Link,
  Text,
} from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import { AppIcon } from "./AppIcon"

export function Header() {
  return (
    <Box
      as="header"
      bg="bg.surface"
      borderBottomWidth="1px"
      borderColor="border.default"
    >
      <Container maxW="1100px" px={{ base: 4, md: 6 }} py={3}>
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
      </Container>
    </Box>
  )
}
