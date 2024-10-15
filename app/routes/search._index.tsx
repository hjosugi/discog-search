import { useState } from "react"
import { useLoaderData, useSearchParams } from "@remix-run/react"
import { discogsFetch } from "../utils/discogsAuthMiddleware"
import { Box, Input, Button, Spinner, Heading, VStack } from "@chakra-ui/react"

import { ResultList } from "../components/ResultList"
import { SearchParam, SearchResult } from "../types"

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)

  const q = url.searchParams.get("q")
  const artist = url.searchParams.get("artist")
  const credit = url.searchParams.get("credit")

  if (!q && !artist && !credit) {
    return { results: [], isSearching: false }
  }

  const params: SearchParam = {
    q: q || artist || credit,
    type: "master",
    per_page: 100,
    page: 0,
  }
  let searchResults = await discogsFetch("database/search", params)
  let allResults = searchResults.results

  let MAX = artist ? 3 : 1
  while (
    searchResults.pagination &&
    searchResults.pagination.page < searchResults.pagination.pages &&
    searchResults.pagination.page < MAX
  ) {
    params.page = searchResults.pagination.page + 1
    searchResults = await discogsFetch("database/search", params)
    allResults = allResults.concat(searchResults.results)
  }

  const results: SearchResult[] = allResults
    .filter((r: any) => {
      if (artist) {
        return r.title.toLowerCase().includes(artist.toLowerCase())
      }
      return true
    })
    .sort((a: any, b: any) => {
      if (artist) {
        const artistA = a.title.toUpperCase()
        const artistB = b.title.toUpperCase()
        if (artistA < artistB) {
          return -1
        }
        if (artistA > artistB) {
          return 1
        }
        return 0
      }
      return 0
    })

  return {
    results,
    isSearching: false,
  }
}

export default function SearchPage() {
  const {
    results,
    isSearching,
  }: { results: SearchResult[]; isSearching: boolean } = useLoaderData()
  const [searchParams] = useSearchParams()

  const [q, setq] = useState(() => searchParams.get("q") || "")
  const [artist, setArtist] = useState(() => searchParams.get("artist") || "")
  const [credit, setcredit] = useState(() => searchParams.get("credit") || "")
  const [genre, setGenre] = useState(() => searchParams.get("genre") || "")

  const isSearchDisabled = !q && !artist && !credit

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.append("q", q)
    if (artist) params.append("artist", artist)
    if (credit) params.append("credit", credit)
    if (genre) params.append("genre", genre)
    window.location.search = params.toString()
  }

  return (
    <Box p={5} maxW="600px" mx="auto">
      <Heading as="h1" size="ml" mb={4}>
        検索
      </Heading>

      <VStack as="form" onSubmit={handleSubmit} spacing={2} align="stretch">
        <Input
          placeholder="楽曲名"
          value={q}
          onChange={(e) => setq(e.target.value)}
          size="sm"
        />
        <Input
          placeholder="アーティスト名"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          size="sm"
        />
        <Input
          placeholder="credit名"
          value={credit}
          onChange={(e) => setcredit(e.target.value)}
          size="sm"
        />
        <Input
          placeholder="ジャンル"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          size="sm"
          list="genre-suggestions"
        />
        <datalist id="genre-suggestions">
          <option value="Jazz" />
          <option value="Rock" />
          <option value="Pop" />
          <option value="Classical" />
          <option value="Hip Hop" />
          <option value="Electronic" />
        </datalist>
        <Button
          colorScheme="blue"
          type="submit"
          isDisabled={isSearchDisabled}
          size="sm"
        >
          検索
        </Button>
      </VStack>

      <Box mt={4} maxH="400px" overflowY="auto">
        {isSearching ? (
          <Spinner size="ml" mt={4} />
        ) : (
          <ResultList
            results={results}
            searchParams={{ q, artist, credit, genre }}
          />
        )}
      </Box>
    </Box>
  )
}
