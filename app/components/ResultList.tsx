import { Box, Image, Text } from "@chakra-ui/react"
import { Link } from "@remix-run/react"

import { SearchResult } from "../types"
export function ResultList({
  results,
  searchParams,
}: {
  results: SearchResult[]
  searchParams: { [key: string]: string }
}) {
  if (results.length === 0) return null

  return (
    <Box mt={5}>
      {results.map((result) => (
        <Box key={result.id} mb={3}>
          <Link
            to={`/search/${result.id}?${new URLSearchParams(
              searchParams
            ).toString()}`}
          >
            <Box display="flex" alignItems="center">
              <Image
                src={result.thumb}
                alt={result.title}
                boxSize="50px"
                mr={3}
              />
              <Box>
                <Text fontSize="lg">{result.title}</Text>
                <Text fontSize="sm" color="gray.500">
                  {result.year}
                </Text>
              </Box>
            </Box>
          </Link>
        </Box>
      ))}
    </Box>
  )
}
