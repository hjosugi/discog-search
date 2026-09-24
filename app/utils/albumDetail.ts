import type {
  DiscogsMaster,
  DiscogsRelease,
  DiscogsVideo,
  TrackItem,
} from "../types"
import { buildPageMeta, compactText } from "./pageMeta"
import { normalizeText } from "./text"
import { findBestTrackMatch } from "./trackCredits"

export type DetailKind = "master" | "release"

export type DetailLocation = {
  detailId: string
  detailKind: DetailKind
  /** The search/detail query string the page was opened with. */
  backQuery: string
}

/**
 * Builds a link to the same album detail page with some query parameters
 * changed (`null` removes one). The search context in `backQuery` is kept so
 * "Back to List" still returns to the original results.
 */
export function buildDetailHref(
  { detailId, detailKind, backQuery }: DetailLocation,
  changes: Record<string, string | null>
) {
  const params = new URLSearchParams(backQuery)

  for (const [key, value] of Object.entries(changes)) {
    if (value === null) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
  }
  if (detailKind === "release") params.set("kind", "release")

  const queryString = params.toString()
  return `/search/${detailId}${queryString ? `?${queryString}` : ""}`
}

export function buildSearchListHref(backQuery: string) {
  return `/search${backQuery ? `?${backQuery}` : ""}`
}

export function buildCreditSearchPath(name: string) {
  const params = new URLSearchParams({ credit: name })
  return `/search?${params.toString()}`
}

export function getCoverImage(release: DiscogsRelease, master: DiscogsMaster) {
  return release.images?.[0]?.uri || master.images?.[0]?.uri || null
}

export function getThumbnailImage(
  release: DiscogsRelease,
  master: DiscogsMaster
) {
  const image = release.images?.[0] || master.images?.[0]
  return image?.uri150 || image?.uri || null
}

export function getArtistName(release: DiscogsRelease, master: DiscogsMaster) {
  return (
    release.artists_sort ||
    release.artists?.map((artist) => artist.name).join(", ") ||
    master.artists?.map((artist) => artist.name).join(", ") ||
    ""
  )
}

/** Up to three videos, preferring the ones whose title mentions the track. */
export function getMatchingVideos(videos: DiscogsVideo[], trackTitle?: string) {
  if (!trackTitle) return videos.slice(0, 3)

  const normalizedTrackTitle = normalizeText(trackTitle)
  const matchedVideos = videos.filter((video) =>
    normalizeText(video.title).includes(normalizedTrackTitle)
  )
  return (matchedVideos.length > 0 ? matchedVideos : videos).slice(0, 3)
}

/** The URL-selected track, else the best match for the searched song, else the first track. */
export function pickSelectedTrack(
  tracks: TrackItem[],
  selectedTrackPosition: string | null,
  searchQuery: string
) {
  return (
    tracks.find((track) => track.position === selectedTrackPosition) ||
    findBestTrackMatch(tracks, searchQuery) ||
    tracks[0]
  )
}

export function buildAlbumPageMeta(
  data?: {
    master: DiscogsMaster
    release: DiscogsRelease
    searchQuery: string
    selectedTrackPosition: string | null
  }
) {
  if (!data) {
    return buildPageMeta({
      title: "Album details | Sideman Album Finder",
      description: "Explore Discogs album credits, track performers, and release details.",
    })
  }

  const { master, release, searchQuery, selectedTrackPosition } = data
  const artistName = getArtistName(release, master)
  const title = `${release.title}${artistName ? ` by ${artistName}` : ""} | Sideman Album Finder`
  const selectedTrack = pickSelectedTrack(
    release.tracklist || master.tracklist || [],
    selectedTrackPosition,
    searchQuery
  )
  const trackText = selectedTrack ? ` Track focus: ${selectedTrack.title}.` : ""
  const description = `${artistName ? `${artistName} - ` : ""}${release.title}${release.year ? ` (${release.year})` : ""}. Explore Discogs performers, credits, tracks, and source release links.${trackText}`

  return buildPageMeta({
    title: compactText(title, 90),
    description: compactText(description),
    image: getCoverImage(release, master) || "/logo-dark.png",
    type: "music.album",
  })
}
