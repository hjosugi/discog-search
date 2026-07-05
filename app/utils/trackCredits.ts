import type { ExtraArtist, TrackItem } from "../types"

export type Credit = ExtraArtist & {
  source: "track" | "release"
  isGlobal: boolean
}

export function findBestTrackMatch(tracks: TrackItem[], query: string) {
  const normalizedQuery = normalizeTrackText(query)
  if (!normalizedQuery) return null

  return (
    tracks.find((track) => normalizeTrackText(track.title) === normalizedQuery) ||
    tracks.find((track) => normalizeTrackText(track.title).includes(normalizedQuery)) ||
    tracks.find((track) => normalizedQuery.includes(normalizeTrackText(track.title))) ||
    null
  )
}

export function getTrackCredits(
  selectedTrack: TrackItem | undefined,
  tracks: TrackItem[],
  releaseCredits: ExtraArtist[] = []
) {
  if (!selectedTrack) return []

  const directCredits = (selectedTrack.extraartists || []).map((artist) => ({
    ...artist,
    source: "track" as const,
    isGlobal: false,
  }))
  const releaseLevelCredits = releaseCredits
    .filter((artist) => creditAppliesToTrack(artist.tracks, selectedTrack, tracks))
    .map((artist) => ({
      ...artist,
      source: "release" as const,
      isGlobal: !artist.tracks,
    }))

  return [...directCredits, ...releaseLevelCredits]
}

export function creditAppliesToTrack(
  creditTracks: string | undefined,
  selectedTrack: TrackItem,
  tracks: TrackItem[]
) {
  if (!creditTracks) return true

  const position = normalizePosition(selectedTrack.position)
  const allPositions = tracks.map((track) => normalizePosition(track.position))
  const segments = creditTracks.split(",").map((segment) => segment.trim())

  return segments.some((segment) => {
    const normalizedSegment = normalizePosition(segment)
    if (normalizedSegment === position) return true
    if (!/\bto\b/i.test(segment) && !segment.includes("-")) return false

    const [start, end] = segment
      .split(/\s+to\s+|-/i)
      .map((value) => normalizePosition(value))
    const startIndex = allPositions.indexOf(start)
    const endIndex = allPositions.indexOf(end)
    const targetIndex = allPositions.indexOf(position)

    return (
      startIndex >= 0 &&
      endIndex >= 0 &&
      targetIndex >= Math.min(startIndex, endIndex) &&
      targetIndex <= Math.max(startIndex, endIndex)
    )
  })
}

function normalizeTrackText(value = "") {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function normalizePosition(value: string) {
  return value.toUpperCase().replace(/\s+/g, "")
}
