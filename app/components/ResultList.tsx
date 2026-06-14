import { Badge, Box, HStack, Image, Text, VStack, Wrap } from "@chakra-ui/react"
import { Link } from "@remix-run/react"

import { SearchResult } from "../types"

function buildSearchParams(searchParams: { [key: string]: string }) {
  const params = new URLSearchParams()
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  return params.toString()
}

export function ResultList({
  results,
  searchParams,
}: {
  results: SearchResult[]
  searchParams: { [key: string]: string }
}) {
  if (results.length === 0) return null

  const queryString = buildSearchParams(searchParams)

  return (
    <Box mt={5}>
      {results.map((result) => (
        <Box
          key={result.id}
          mb={3}
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          _hover={{ borderColor: "blue.200", bg: "gray.50" }}
        >
          <Link to={`/search/${result.id}${queryString ? `?${queryString}` : ""}`}>
            <HStack align="start" spacing={3} p={3}>
              {result.thumb ? (
                <Image
                  src={result.thumb}
                  alt={result.title}
                  boxSize={{ base: "56px", md: "64px" }}
                  objectFit="cover"
                  borderRadius="sm"
                />
              ) : (
                <Box
                  boxSize={{ base: "56px", md: "64px" }}
                  bg="gray.100"
                  borderRadius="sm"
                  flexShrink={0}
                />
              )}
              <VStack align="stretch" spacing={1} flex="1" minW={0}>
                <Text fontSize="md" fontWeight="semibold" noOfLines={2}>
                  {result.title}
                </Text>
                <Text fontSize="sm" color="gray.600" noOfLines={1}>
                  {buildSummary(result)}
                </Text>
                <Wrap spacing={1} pt={1}>
                  {buildTags(result).map((tag) => (
                    <Badge key={tag} colorScheme="gray" fontWeight="normal">
                      {tag}
                    </Badge>
                  ))}
                </Wrap>
              </VStack>
            </HStack>
          </Link>
        </Box>
      ))}
    </Box>
  )
}

function buildSummary(result: SearchResult) {
  return [
    result.year,
    result.country,
    firstValue(result.label),
    result.catno,
  ]
    .filter(Boolean)
    .join(" / ")
}

function buildTags(result: SearchResult) {
  return [
    firstValue(result.format),
    firstValue(result.genre),
    firstValue(result.style),
  ].filter((tag): tag is string => Boolean(tag))
}

function firstValue(values?: string[]) {
  return values?.find(Boolean)
}
