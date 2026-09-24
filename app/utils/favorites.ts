import type { DetailKind } from "./albumDetail"

export type FavoriteAlbum = {
  /** Discogs master or release id used by the detail route. */
  id: string
  kind: DetailKind
  title: string
  artist?: string
  year?: string
  thumb?: string
  /** Search context the album was saved from, shown as a memo. */
  credit?: string
  song?: string
  savedAt: number
}

export type FavoriteAlbumInput = Omit<FavoriteAlbum, "savedAt">

export const FAVORITES_STORAGE_KEY = "discog-search:favorites"
export const MAX_FAVORITES = 200

export function getFavoriteKey(album: { id: string; kind: DetailKind }) {
  return `${album.kind}:${album.id}`
}

export function isFavoriteAlbum(
  entries: FavoriteAlbum[],
  album: { id: string; kind: DetailKind }
) {
  const key = getFavoriteKey(album)
  return entries.some((entry) => getFavoriteKey(entry) === key)
}

/** Adds the album to the front of the list, replacing an older copy of it. */
export function addFavorite(
  entries: FavoriteAlbum[],
  album: FavoriteAlbumInput,
  savedAt = Date.now()
) {
  const normalized = normalizeFavorite({ ...album, savedAt })
  if (!normalized) return entries

  const key = getFavoriteKey(normalized)
  return [
    normalized,
    ...entries.filter((entry) => getFavoriteKey(entry) !== key),
  ].slice(0, MAX_FAVORITES)
}

export function removeFavorite(
  entries: FavoriteAlbum[],
  album: { id: string; kind: DetailKind }
) {
  const key = getFavoriteKey(album)
  return entries.filter((entry) => getFavoriteKey(entry) !== key)
}

export function toggleFavorite(
  entries: FavoriteAlbum[],
  album: FavoriteAlbumInput,
  savedAt = Date.now()
) {
  return isFavoriteAlbum(entries, album)
    ? removeFavorite(entries, album)
    : addFavorite(entries, album, savedAt)
}

/** Link back to the saved album, restoring the credit/song it was saved with. */
export function buildFavoriteHref(entry: FavoriteAlbum) {
  const params = new URLSearchParams()
  if (entry.credit) params.set("credit", entry.credit)
  if (entry.song) params.set("song", entry.song)
  if (entry.kind === "release") params.set("kind", "release")

  const queryString = params.toString()
  return `/search/${entry.id}${queryString ? `?${queryString}` : ""}`
}

/** Parses untrusted stored JSON, dropping malformed entries and duplicates. */
export function parseFavorites(value: unknown): FavoriteAlbum[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const entries: FavoriteAlbum[] = []

  for (const item of value) {
    const entry = normalizeFavorite(item)
    if (!entry) continue

    const key = getFavoriteKey(entry)
    if (seen.has(key)) continue
    seen.add(key)
    entries.push(entry)
  }

  return entries.slice(0, MAX_FAVORITES)
}

function normalizeFavorite(value: unknown): FavoriteAlbum | null {
  if (!value || typeof value !== "object") return null

  const entry = value as Record<string, unknown>
  const id = toText(entry.id)
  const title = toText(entry.title)
  const kind = entry.kind === "release" ? "release" : entry.kind === "master" ? "master" : null

  if (!/^\d+$/.test(id) || !title || !kind) return null

  return {
    id,
    kind,
    title,
    artist: toText(entry.artist) || undefined,
    year: toText(entry.year) || undefined,
    thumb: toText(entry.thumb) || undefined,
    credit: toText(entry.credit) || undefined,
    song: toText(entry.song) || undefined,
    savedAt:
      typeof entry.savedAt === "number" && Number.isFinite(entry.savedAt)
        ? entry.savedAt
        : Date.now(),
  }
}

function toText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return typeof value === "string" ? value.trim() : ""
}
