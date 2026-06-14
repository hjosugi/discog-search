import { Badge, Box, HStack, Image, Text, VStack, Wrap } from "@chakra-ui/react"
import { Link } from "@remix-run/react"

import { AppIcon } from "./AppIcon"
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
      {results.map((result) => {
        const summary = buildSummary(result)

        return (
          <Box
            key={result.id}
            mb={3}
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            transition="border-color 120ms ease, box-shadow 120ms ease"
            _hover={{ borderColor: "blue.300", boxShadow: "sm" }}
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
                    flexShrink={0}
                  />
                ) : (
                  <Box
                    alignItems="center"
                    boxSize={{ base: "56px", md: "64px" }}
                    bg="gray.100"
                    borderRadius="sm"
                    color="gray.400"
                    display="flex"
                    flexShrink={0}
                    justifyContent="center"
                  >
                    <AppIcon name="disc" size={24} />
                  </Box>
                )}
                <VStack align="stretch" spacing={2} flex="1" minW={0}>
                  <HStack align="start" justify="space-between" spacing={3}>
                    <Box minW={0}>
                      <Text fontSize="md" fontWeight="semibold" noOfLines={2}>
                        {result.title}
                      </Text>
                      {summary && (
                        <HStack color="gray.600" spacing={1} mt={1}>
                          <AppIcon name="tag" size={13} />
                          <Text fontSize="sm" noOfLines={1}>
                            {summary}
                          </Text>
                        </HStack>
                      )}
                    </Box>
                    <Text color="gray.400" flexShrink={0} mt={1}>
                      <AppIcon name="external" size={15} />
                    </Text>
                  </HStack>
                  <Wrap spacing={1}>
                    {buildTags(result).map((tag) => (
                      <Badge
                        key={tag}
                        bg="gray.100"
                        color="gray.700"
                        fontWeight="medium"
                        textTransform="none"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </Wrap>
                </VStack>
              </HStack>
            </Link>
          </Box>
        )
      })}
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
