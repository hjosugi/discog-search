import { Box, Image, Text } from "@chakra-ui/react"
import { Link } from "@remix-run/react"

import { SearchResult } from "../types"
<<<<<<< HEAD

function buildSearchParams(searchParams: { [key: string]: string }) {
  const params = new URLSearchParams()
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  return params.toString()
}

||||||| e3e4796
import { SearchParam, SearchResult } from "../types"
=======
>>>>>>> origin/codex/add-musician-information-feature
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
        <Box key={result.id} mb={3}>
          <Link to={`/search/${result.id}${queryString ? `?${queryString}` : ""}`}>
            <Box display="flex" alignItems="center">
              {result.thumb ? (
                <Image
                  src={result.thumb}
                  alt={result.title}
                  boxSize="50px"
                  mr={3}
                  objectFit="cover"
                />
              ) : (
                <Box boxSize="50px" mr={3} bg="gray.100" borderRadius="sm" />
              )}
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
