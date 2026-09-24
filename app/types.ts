// Discogs payload types are derived from the runtime schemas that validate
// them at the API boundary (see app/server/discogs/schemas.ts). These are
// type-only re-exports, so no schema code reaches the client bundle.
export type {
  DiscogsMaster,
  DiscogsRelease,
  DiscogsVideo,
  ExtraArtist,
  SearchResult,
  TrackItem,
} from "./server/discogs/schemas"

export interface SearchParam
  extends Record<string, string | number | null | undefined> {
  page: number
  q?: string | null
  artist?: string | null
  credit?: string | null
  track?: string | null
  genre?: string | null
  year?: string | null
  country?: string | null
  format?: string | null
  type: "master" | "release"
  per_page: number
}
