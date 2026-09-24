import { Type, type Static, type TSchema } from "@sinclair/typebox"
import { Value } from "@sinclair/typebox/value"

import { DiscogsResponseError } from "./errors"

/**
 * Boundary schemas for the Discogs payloads the app reads. They only describe
 * the fields the app uses; extra fields are allowed and passed through. The
 * TypeScript types in `app/types.ts` are derived from these schemas.
 */

const DiscogsArtistSchema = Type.Object({
  id: Type.Optional(Type.Number()),
  name: Type.String(),
  anv: Type.Optional(Type.String()),
  join: Type.Optional(Type.String()),
  role: Type.Optional(Type.String()),
  tracks: Type.Optional(Type.String()),
  resource_url: Type.Optional(Type.String()),
  thumbnail_url: Type.Optional(Type.String()),
})

export const ExtraArtistSchema = Type.Object({
  id: Type.Optional(Type.Number()),
  name: Type.String(),
  role: Type.String(),
  anv: Type.Optional(Type.String()),
  join: Type.Optional(Type.String()),
  tracks: Type.Optional(Type.String()),
  resource_url: Type.Optional(Type.String()),
  thumbnail_url: Type.Optional(Type.String()),
})

const DiscogsImageSchema = Type.Object({
  uri: Type.Optional(Type.String()),
  uri150: Type.Optional(Type.String()),
  width: Type.Optional(Type.Number()),
  height: Type.Optional(Type.Number()),
  type: Type.Optional(Type.String()),
})

export const DiscogsVideoSchema = Type.Object({
  uri: Type.String(),
  title: Type.String(),
  description: Type.Optional(Type.String()),
  duration: Type.Optional(Type.Number()),
  embed: Type.Optional(Type.Boolean()),
})

export const TrackItemSchema = Type.Object({
  position: Type.String(),
  type_: Type.String(),
  title: Type.String(),
  duration: Type.Optional(Type.String()),
  extraartists: Type.Optional(Type.Array(ExtraArtistSchema)),
})

export const DiscogsMasterSchema = Type.Object({
  id: Type.Number(),
  title: Type.String(),
  year: Type.Optional(Type.Number()),
  artists: Type.Optional(Type.Array(DiscogsArtistSchema)),
  images: Type.Optional(Type.Array(DiscogsImageSchema)),
  tracklist: Type.Optional(Type.Array(TrackItemSchema)),
  extraartists: Type.Optional(Type.Array(ExtraArtistSchema)),
  main_release: Type.Optional(Type.Number()),
  videos: Type.Optional(Type.Array(DiscogsVideoSchema)),
  uri: Type.Optional(Type.String()),
})

export const DiscogsReleaseSchema = Type.Composite([
  DiscogsMasterSchema,
  Type.Object({
    artists_sort: Type.Optional(Type.String()),
    master_id: Type.Optional(Type.Number()),
    country: Type.Optional(Type.String()),
    released: Type.Optional(Type.String()),
  }),
])

export const SearchResultSchema = Type.Object({
  id: Type.Number(),
  title: Type.String(),
  artist: Type.Optional(Type.String()),
  thumb: Type.Optional(Type.String()),
  cover_image: Type.Optional(Type.String()),
  country: Type.Optional(Type.String()),
  year: Type.Optional(Type.String()),
  format: Type.Optional(Type.Array(Type.String())),
  label: Type.Optional(Type.Array(Type.String())),
  type: Type.Optional(Type.String()),
  genre: Type.Optional(Type.Array(Type.String())),
  style: Type.Optional(Type.Array(Type.String())),
  barcode: Type.Optional(Type.Array(Type.String())),
  uri: Type.Optional(Type.String()),
  catno: Type.Optional(Type.String()),
  master_id: Type.Optional(Type.Number()),
})

const DiscogsPaginationSchema = Type.Object({
  page: Type.Number(),
  pages: Type.Number(),
  items: Type.Optional(Type.Number()),
  per_page: Type.Optional(Type.Number()),
})

export const DiscogsSearchResponseSchema = Type.Object({
  pagination: Type.Optional(DiscogsPaginationSchema),
  results: Type.Optional(Type.Array(SearchResultSchema)),
})

export const MasterVersionSchema = Type.Object({
  id: Type.Number(),
  title: Type.String(),
  format: Type.Optional(Type.String()),
  label: Type.Optional(Type.String()),
  country: Type.Optional(Type.String()),
  released: Type.Optional(Type.String()),
  catno: Type.Optional(Type.String()),
  major_formats: Type.Optional(Type.Array(Type.String())),
  thumb: Type.Optional(Type.String()),
})

export const MasterVersionsResponseSchema = Type.Object({
  pagination: Type.Optional(DiscogsPaginationSchema),
  versions: Type.Optional(Type.Array(MasterVersionSchema)),
})

export type ExtraArtist = Static<typeof ExtraArtistSchema>
export type DiscogsVideo = Static<typeof DiscogsVideoSchema>
export type TrackItem = Static<typeof TrackItemSchema>
export type DiscogsMaster = Static<typeof DiscogsMasterSchema>
export type DiscogsRelease = Static<typeof DiscogsReleaseSchema>
export type SearchResult = Static<typeof SearchResultSchema>
export type DiscogsSearchResponse = Static<typeof DiscogsSearchResponseSchema>
export type MasterVersion = Static<typeof MasterVersionSchema>
export type MasterVersionsResponse = Static<typeof MasterVersionsResponseSchema>

/**
 * Validates a Discogs JSON payload. `null` values are treated as missing
 * fields first, because Discogs uses both `null` and omission for "no value".
 */
export function parseDiscogsResponse<T extends TSchema>(
  schema: T,
  value: unknown,
  endpoint: string
): Static<T> {
  const normalized = dropNulls(value)

  if (Value.Check(schema, normalized)) {
    return normalized
  }

  const firstError = Value.Errors(schema, normalized).First()
  const details = firstError
    ? `${firstError.path || "/"} ${firstError.message}`
    : "schema mismatch"
  throw new DiscogsResponseError(endpoint, details)
}

function dropNulls(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== null).map(dropNulls)
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      if (item !== null) result[key] = dropNulls(item)
    }
    return result
  }

  return value
}
