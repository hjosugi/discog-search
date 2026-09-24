import { useCallback, useEffect, useState } from "react"

import { createTranslator, type Translate } from "../i18n/locale"
import type { SearchSortOption } from "../utils/searchRanking"

export type SearchHistoryInput = {
  credit: string
  song: string
  genre: string
  role: string
  year: string
  decade: string
  country: string
  format: string
  sort: SearchSortOption
}

export type SearchHistoryEntry = SearchHistoryInput & {
  id: string
  createdAt: number
}

const STORAGE_KEY = "discog-search:recent-searches"
const MAX_HISTORY_ITEMS = 10

export function useSearchHistory(activeSearch: SearchHistoryInput | null) {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setEntries(readSearchHistory())
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated || !activeSearch || !hasSearchCriteria(activeSearch)) {
      return
    }

    setEntries((currentEntries) => {
      const nextEntries = addSearchHistoryEntry(currentEntries, activeSearch)
      writeSearchHistory(nextEntries)
      return nextEntries
    })
  }, [activeSearch, isHydrated])

  const removeEntry = useCallback((id: string) => {
    setEntries((currentEntries) => {
      const nextEntries = currentEntries.filter((entry) => entry.id !== id)
      writeSearchHistory(nextEntries)
      return nextEntries
    })
  }, [])

  const clearEntries = useCallback(() => {
    writeSearchHistory([])
    setEntries([])
  }, [])

  return {
    entries: isHydrated ? entries : [],
    removeEntry,
    clearEntries,
  }
}

export function addSearchHistoryEntry(
  entries: SearchHistoryEntry[],
  input: SearchHistoryInput,
  createdAt = Date.now()
) {
  const normalizedInput = normalizeSearchHistoryInput(input)
  if (!hasSearchCriteria(normalizedInput)) return entries

  const id = buildSearchHistoryKey(normalizedInput)
  const nextEntry = { ...normalizedInput, id, createdAt }

  return [
    nextEntry,
    ...entries.filter((entry) => entry.id !== id),
  ].slice(0, MAX_HISTORY_ITEMS)
}

export function buildSearchHistoryHref(input: SearchHistoryInput) {
  const queryString = buildSearchHistoryKey(input)
  return queryString ? `/search?${queryString}` : "/search"
}

export function buildSearchHistorySummary(
  input: SearchHistoryInput,
  t: Translate = createTranslator("en")
) {
  const parts = [
    input.credit ? t("history.credit", { value: input.credit }) : "",
    input.song ? t("history.song", { value: input.song }) : "",
    input.genre ? t("history.genre", { value: input.genre }) : "",
    input.role ? t("history.role", { value: input.role }) : "",
    input.year ? input.year : "",
    !input.year && input.decade ? t("history.decade", { decade: input.decade }) : "",
    input.country ? input.country : "",
    input.format ? input.format : "",
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" / ") : t("history.fallback")
}

function readSearchHistory() {
  if (typeof window === "undefined") return []

  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (!value) return []
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map(parseSearchHistoryEntry)
      .filter((entry): entry is SearchHistoryEntry => Boolean(entry))
      .slice(0, MAX_HISTORY_ITEMS)
  } catch {
    return []
  }
}

function writeSearchHistory(entries: SearchHistoryEntry[]) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Ignore storage failures so private browsing and quota errors do not block search.
  }
}

function parseSearchHistoryEntry(value: unknown) {
  if (!value || typeof value !== "object") return null

  const entry = value as Partial<SearchHistoryEntry>
  const input = normalizeSearchHistoryInput({
    credit: String(entry.credit || ""),
    song: String(entry.song || ""),
    genre: String(entry.genre || ""),
    role: String(entry.role || ""),
    year: String(entry.year || ""),
    decade: String(entry.decade || ""),
    country: String(entry.country || ""),
    format: String(entry.format || ""),
    sort: entry.sort === "year_asc" || entry.sort === "year_desc"
      ? entry.sort
      : "relevance",
  })
  const id = buildSearchHistoryKey(input)

  if (!id || !hasSearchCriteria(input)) return null

  return {
    ...input,
    id,
    createdAt:
      typeof entry.createdAt === "number" && Number.isFinite(entry.createdAt)
        ? entry.createdAt
        : Date.now(),
  }
}

function buildSearchHistoryKey(input: SearchHistoryInput) {
  const normalizedInput = normalizeSearchHistoryInput(input)
  const params = new URLSearchParams()

  if (normalizedInput.credit) params.set("credit", normalizedInput.credit)
  if (normalizedInput.song) params.set("song", normalizedInput.song)
  if (normalizedInput.genre) params.set("genre", normalizedInput.genre)
  if (normalizedInput.role) params.set("role", normalizedInput.role)
  if (normalizedInput.year) {
    params.set("year", normalizedInput.year)
  } else if (normalizedInput.decade) {
    params.set("decade", normalizedInput.decade)
  }
  if (normalizedInput.country) params.set("country", normalizedInput.country)
  if (normalizedInput.format) params.set("format", normalizedInput.format)
  if (normalizedInput.sort !== "relevance") {
    params.set("sort", normalizedInput.sort)
  }

  return params.toString()
}

function normalizeSearchHistoryInput(input: SearchHistoryInput) {
  return {
    credit: input.credit.trim(),
    song: input.song.trim(),
    genre: input.genre.trim(),
    role: input.role.trim(),
    year: input.year.trim(),
    decade: input.year.trim() ? "" : input.decade.trim(),
    country: input.country.trim(),
    format: input.format.trim(),
    sort: input.sort,
  }
}

function hasSearchCriteria(input: SearchHistoryInput) {
  return Boolean(input.credit.trim() || input.song.trim() || input.genre.trim())
}
