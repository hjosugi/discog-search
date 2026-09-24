import type { SearchResult } from "../types"
import { normalizeForRanking } from "./text"

export type SearchSortOption = "relevance" | "year_desc" | "year_asc"

export function rankSearchResults(
  results: SearchResult[],
  filters: {
    credit: string
    song: string
    genre: string
  },
  options: {
    sort?: SearchSortOption
  } = {}
) {
  const sort = options.sort || "relevance"

  return dedupeResults(results)
    .map((result) => ({
      result,
      score: scoreResult(result, filters),
    }))
    .filter(({ score }) => score > -30)
    .sort((a, b) => {
      if (sort === "year_desc") {
        return (
          getYearValue(b.result.year) - getYearValue(a.result.year) ||
          b.score - a.score
        )
      }

      if (sort === "year_asc") {
        return (
          getSortableYearValue(a.result.year) -
            getSortableYearValue(b.result.year) ||
          b.score - a.score
        )
      }

      if (b.score !== a.score) return b.score - a.score
      return getYearValue(b.result.year) - getYearValue(a.result.year)
    })
    .map(({ result }) => result)
}

function dedupeResults(results: SearchResult[]) {
  const seen = new Set<string>()

  return results.filter((result) => {
    const key = [
      normalizeForRanking(result.title),
      result.year || "",
      result.country || "",
    ].join("|")

    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function scoreResult(
  result: SearchResult,
  filters: {
    credit: string
    song: string
    genre: string
  }
) {
  const normalizedTitle = normalizeForRanking(result.title)
  const normalizedQuery = normalizeForRanking(filters.song)
  const queryTokens = tokenize(filters.song)
  const creditTokens = tokenize(filters.credit)
  const genreTokens = tokenize(filters.genre)
  const metadata = normalizeForRanking(
    [
      result.artist,
      result.country,
      result.format?.join(" "),
      result.label?.join(" "),
      result.genre?.join(" "),
      result.style?.join(" "),
      result.catno,
    ]
      .filter(Boolean)
      .join(" ")
  )
  const searchableText = `${normalizedTitle} ${metadata}`.trim()
  const primaryArtist = getPrimaryArtist(result.title)
  let score = 0

  if (normalizedQuery) {
    if (normalizedTitle === normalizedQuery) score += 80
    if (normalizedTitle.includes(normalizedQuery)) score += 40
    if (normalizedTitle.startsWith(normalizedQuery)) score += 20

    const matchedTokens = queryTokens.filter((token) =>
      searchableText.includes(token)
    )
    score += matchedTokens.length * 12
    score -= (queryTokens.length - matchedTokens.length) * 18
  }

  if (creditTokens.length > 0) {
    const matchedCreditTokens = creditTokens.filter((token) =>
      searchableText.includes(token)
    )
    score += matchedCreditTokens.length * 4

    const primaryArtistTokens = new Set(tokenize(primaryArtist))
    const primaryArtistMatches = creditTokens.filter((token) =>
      primaryArtistTokens.has(token)
    )
    if (
      primaryArtistMatches.length === creditTokens.length &&
      creditTokens.length > 0
    ) {
      score -= 24
    }
  }

  if (genreTokens.length > 0) {
    const genreText = normalizeForRanking(
      [result.genre?.join(" "), result.style?.join(" ")].filter(Boolean).join(" ")
    )
    const matchedGenreTokens = genreTokens.filter((token) =>
      genreText.includes(token)
    )
    score += matchedGenreTokens.length * 18
    score -= (genreTokens.length - matchedGenreTokens.length) * 10
  }

  if (result.type === "master") score += 8
  if (result.thumb) score += 4
  if (result.year) score += 3
  if (result.format?.some((format) => /album|lp|cd/i.test(format))) score += 3
  if (/various artists/i.test(result.title)) score -= 12

  return score
}

function tokenize(value: string) {
  return normalizeForRanking(value)
    .split(" ")
    .filter((token) => token.length > 1)
}

function getPrimaryArtist(title: string) {
  return normalizeForRanking(title.split(/\s+[-–—]\s+/)[0] || "")
}

function getYearValue(year?: string) {
  const value = Number(year)
  return Number.isFinite(value) ? value : 0
}

function getSortableYearValue(year?: string) {
  const value = Number(year)
  return Number.isFinite(value) && value > 0 ? value : Number.MAX_SAFE_INTEGER
}
