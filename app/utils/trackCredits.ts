import type { ExtraArtist, TrackItem } from "../types"
import { cleanSearchText, normalizePosition, normalizeText } from "./text"

export type Credit = ExtraArtist & {
  source: "track" | "release"
  isGlobal: boolean
}

export const PERFORMANCE_ROLE_PATTERNS = [
  "drum",
  "percussion",
  "conga",
  "bongo",
  "bass",
  "guitar",
  "banjo",
  "mandolin",
  "vocal",
  "voice",
  "piano",
  "keyboard",
  "synth",
  "organ",
  "accordion",
  "sax",
  "clarinet",
  "flute",
  "trumpet",
  "trombone",
  "horn",
  "violin",
  "viola",
  "cello",
  "strings",
  "vibraphone",
  "vibes",
  "marimba",
  "harp",
  "harmonica",
  "performer",
]

export type PersonTrackCredit = {
  track: TrackItem
  roles: string[]
}

export type PersonAlbumCredits = {
  /** Tracks the person is credited on, in tracklist order. */
  tracks: PersonTrackCredit[]
  /** Album-wide roles that are not tied to tracks (e.g. Producer). */
  albumRoles: string[]
}

/**
 * Matches a searched person against a Discogs credit. Discogs appends
 * disambiguation suffixes ("Tony Williams (2)") and may credit a name
 * variation (`anv`), so both are compared after normalization; a query whose
 * words all appear in the credited name ("Hancock") also matches.
 */
export function creditMatchesPerson(
  credit: Pick<ExtraArtist, "name" | "anv">,
  person: string
) {
  const query = normalizeText(person)
  if (!query) return false

  const names = [credit.name, credit.anv].map((value) => normalizeText(value))
  if (names.includes(query)) return true

  const queryTokens = query.split(" ")
  const nameTokens = new Set(normalizeText(credit.name).split(" "))
  return queryTokens.every((token) => nameTokens.has(token))
}

/**
 * The reverse view of `getTrackCredits`: for one person, which tracks of the
 * album they are credited on and in which roles. Release-level credits are
 * expanded with `creditAppliesToTrack`, so "A1 to B2" ranges count for every
 * track in the range. Album-wide performance credits count for every track;
 * album-wide non-performance credits are reported as `albumRoles`.
 */
export function getPersonAlbumCredits(
  person: string,
  tracks: TrackItem[],
  releaseCredits: ExtraArtist[] = []
): PersonAlbumCredits | null {
  if (!normalizeText(person)) return null

  const playableTracks = tracks.filter((track) => track.type_ === "track")
  const personTracks = playableTracks
    .map((track) => {
      const roles = getTrackCredits(track, playableTracks, releaseCredits)
        .filter((credit) => creditMatchesPerson(credit, person))
        .filter((credit) => !credit.isGlobal || isPerformanceRole(credit.role))
        .map((credit) => credit.role)
      return { track, roles: uniqueRoles(roles) }
    })
    .filter((entry) => entry.roles.length > 0)
  const albumRoles = uniqueRoles(
    releaseCredits
      .filter((credit) => !credit.tracks && !isPerformanceRole(credit.role))
      .filter((credit) => creditMatchesPerson(credit, person))
      .map((credit) => credit.role)
  )

  if (personTracks.length === 0 && albumRoles.length === 0) return null
  return { tracks: personTracks, albumRoles }
}

function uniqueRoles(roles: string[]) {
  const seen = new Set<string>()
  return roles.filter((role) => {
    const key = normalizeText(role)
    if (!role || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function findBestTrackMatch(tracks: TrackItem[], query: string) {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return null

  return (
    tracks.find((track) => normalizeText(track.title) === normalizedQuery) ||
    tracks.find((track) => normalizeText(track.title).includes(normalizedQuery)) ||
    tracks.find((track) => normalizedQuery.includes(normalizeText(track.title))) ||
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

export function isPerformanceRole(role: string) {
  const normalizedRole = role.toLowerCase()
  return PERFORMANCE_ROLE_PATTERNS.some((pattern) =>
    normalizedRole.includes(pattern)
  )
}

export function filterCreditsByRole(credits: Credit[], roleFilter: string) {
  return credits.filter((credit) => roleMatchesFilter(credit.role, roleFilter))
}

export function roleMatchesFilter(role: string, roleFilter: string) {
  const normalizedFilter = normalizeText(roleFilter)
  if (!normalizedFilter) return true

  const normalizedRole = normalizeText(role)
  return (
    normalizedRole.includes(normalizedFilter) ||
    normalizedFilter.includes(normalizedRole)
  )
}

export function dedupeCredits(credits: Credit[]) {
  const seen = new Set<string>()
  return credits.filter((credit) => {
    const key = [
      normalizeText(credit.name),
      normalizeText(credit.role),
      credit.source,
    ].join("-")
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getRoleFilterOptions(credits: Credit[]) {
  const rolesByKey = new Map<string, string>()

  dedupeCredits(credits).forEach((credit) => {
    splitCreditRoles(credit.role)
      .filter(isPerformanceRole)
      .forEach((role) => {
        const key = normalizeText(role)
        if (key && !rolesByKey.has(key)) {
          rolesByKey.set(key, role)
        }
      })
  })

  return [...rolesByKey.values()]
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

function splitCreditRoles(role: string) {
  return role
    .split(/\s*(?:,|;|\/|&|\band\b)\s*/i)
    .map(cleanSearchText)
    .filter(Boolean)
}
