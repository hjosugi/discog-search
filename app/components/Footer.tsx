import {
  Box,
  Container,
  HStack,
  Link,
  Text,
} from "@chakra-ui/react"

import { AppIcon } from "./AppIcon"

export function Footer() {
  return (
    <Box
      as="footer"
      bg="white"
      borderTopWidth="1px"
      borderColor="gray.200"
    >
      <Container maxW="1100px" px={{ base: 4, md: 6 }} py={4}>
        <HStack
          align="center"
          color="gray.600"
          flexWrap="wrap"
          fontSize="sm"
          justify="space-between"
          spacing={3}
        >
          <Text>
            Data provided by{" "}
            <Link
              href="https://www.discogs.com/"
              color="blue.700"
              fontWeight="semibold"
              isExternal
            >
              Discogs
            </Link>
            .
          </Text>
          <Link
            href="https://github.com/hjosugi/discog-search"
            color="blue.700"
            fontWeight="semibold"
            isExternal
          >
            <HStack as="span" spacing={1}>
              <AppIcon name="external" size={14} />
              <Text as="span">GitHub repository</Text>
            </HStack>
          </Link>
        </HStack>
      </Container>
    </Box>
  )
}
