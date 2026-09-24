import { Box, Button, Heading, HStack, Text } from "@chakra-ui/react"
import { Link as RouterLink } from "react-router"

import { AppIcon } from "../AppIcon"

export function AlbumErrorState({
  status,
  message,
}: {
  status: number
  message: string
}) {
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
          Album details unavailable
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
        Back to Search
      </Button>
    </Box>
  )
}
