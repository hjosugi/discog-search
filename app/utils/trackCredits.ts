import type { ExtraArtist, TrackItem } from "../types"

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
  const normalizedFilter = normalizeCreditText(roleFilter)
  if (!normalizedFilter) return true

  const normalizedRole = normalizeCreditText(role)
  return (
    normalizedRole.includes(normalizedFilter) ||
    normalizedFilter.includes(normalizedRole)
  )
}

export function dedupeCredits(credits: Credit[]) {
  const seen = new Set<string>()
  return credits.filter((credit) => {
    const key = [
      normalizeCreditText(credit.name),
      normalizeCreditText(credit.role),
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
        const key = normalizeCreditText(role)
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
    .map(cleanRoleLabel)
    .filter(Boolean)
}

function cleanRoleLabel(value: string) {
  return value
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeCreditText(value = "") {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
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
