import { SearchResult } from "../types"

export function rankSearchResults(
  results: SearchResult[],
  filters: {
    credit: string
    song: string
    genre: string
  }
) {
  return dedupeResults(results)
    .map((result) => ({
      result,
      score: scoreResult(result, filters),
    }))
    .filter(({ score }) => score > -30)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return getYearValue(b.result.year) - getYearValue(a.result.year)
    })
    .map(({ result }) => result)
}

function dedupeResults(results: SearchResult[]) {
  const seen = new Set<string>()

  return results.filter((result) => {
    const key = [
      normalizeForSearch(result.title),
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
  const normalizedTitle = normalizeForSearch(result.title)
  const normalizedQuery = normalizeForSearch(filters.song)
  const queryTokens = tokenize(filters.song)
  const creditTokens = tokenize(filters.credit)
  const genreTokens = tokenize(filters.genre)
  const metadata = normalizeForSearch(
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
    const genreText = normalizeForSearch(
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
  return normalizeForSearch(value)
    .split(" ")
    .filter((token) => token.length > 1)
}

function normalizeForSearch(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getPrimaryArtist(title: string) {
  return normalizeForSearch(title.split(/\s+[-–—]\s+/)[0] || "")
}

function getYearValue(year?: string) {
  const value = Number(year)
  return Number.isFinite(value) ? value : 0
}
