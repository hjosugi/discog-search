import { describe, expect, it } from "vitest"

import type { TrackItem } from "../types"
import {
  creditAppliesToTrack,
  creditMatchesPerson,
  dedupeCredits,
  filterCreditsByRole,
  findBestTrackMatch,
  getPersonAlbumCredits,
  getRoleFilterOptions,
  getTrackCredits,
  isPerformanceRole,
  roleMatchesFilter,
  type Credit,
} from "./trackCredits"

const tracks: TrackItem[] = [
  { position: "A1", type_: "track", title: "Nefertiti" },
  { position: "A2", type_: "track", title: "Fall" },
  { position: "B1", type_: "track", title: "Pinocchio" },
  { position: "B2", type_: "track", title: "Riot" },
  { position: "B3", type_: "track", title: "Madness" },
]

describe("findBestTrackMatch", () => {
  it("matches normalized track titles with parenthetical take details removed", () => {
    expect(
      findBestTrackMatch(
        [
          { position: "A1", type_: "track", title: "Blue In Green (Take 3)" },
          { position: "A2", type_: "track", title: "Flamenco Sketches" },
        ],
        "Blue in Green"
      )?.position
    ).toBe("A1")
  })
})

describe("creditAppliesToTrack", () => {
  it("matches comma-separated positions", () => {
    expect(creditAppliesToTrack("A1, B3", tracks[4], tracks)).toBe(true)
    expect(creditAppliesToTrack("A1, B3", tracks[2], tracks)).toBe(false)
  })

  it("expands Discogs track ranges written with to", () => {
    expect(creditAppliesToTrack("A1 to B2", tracks[2], tracks)).toBe(true)
    expect(creditAppliesToTrack("A1 to B2", tracks[4], tracks)).toBe(false)
  })

  it("expands reversed hyphenated ranges", () => {
    expect(creditAppliesToTrack("B2-A2", tracks[1], tracks)).toBe(true)
    expect(creditAppliesToTrack("B2-A2", tracks[0], tracks)).toBe(false)
  })
})

describe("getTrackCredits", () => {
  it("combines direct track credits with matching release-level credits", () => {
    const credits = getTrackCredits(tracks[2], tracks, [
      { name: "Tony Williams", role: "Drums", tracks: "A1 to B2" },
      { name: "Wayne Shorter", role: "Saxophone", tracks: "B3" },
      { name: "Teo Macero", role: "Producer" },
    ])

    expect(credits.map((credit) => credit.name)).toEqual([
      "Tony Williams",
      "Teo Macero",
    ])
    expect(credits[0]).toMatchObject({
      source: "release",
      isGlobal: false,
    })
    expect(credits[1]).toMatchObject({
      source: "release",
      isGlobal: true,
    })
  })
})

describe("credit role helpers", () => {
  const credits: Credit[] = [
    {
      name: "Tony Williams",
      role: "Drums, Percussion",
      source: "release",
      isGlobal: false,
    },
    {
      name: "Bobby Hutcherson",
      role: "Vibraphone",
      source: "release",
      isGlobal: false,
    },
    {
      name: "Miles Davis",
      role: "Trumpet [Muted]",
      source: "track",
      isGlobal: false,
    },
    {
      name: "Teo Macero",
      role: "Producer",
      source: "release",
      isGlobal: true,
    },
    {
      name: "Tony Williams",
      role: "Drums, Percussion",
      source: "release",
      isGlobal: false,
    },
  ]

  it("recognizes common performance roles beyond the old fixed chip set", () => {
    expect(isPerformanceRole("Vibraphone")).toBe(true)
    expect(isPerformanceRole("Trumpet")).toBe(true)
    expect(isPerformanceRole("Producer")).toBe(false)
  })

  it("extracts unique role filter options from actual credit roles", () => {
    expect(getRoleFilterOptions(credits)).toEqual([
      "Drums",
      "Percussion",
      "Vibraphone",
      "Trumpet",
    ])
  })

  it("matches free-form role filters against longer Discogs role labels", () => {
    expect(roleMatchesFilter("Electric Bass", "bass")).toBe(true)
    expect(roleMatchesFilter("Bass", "electric bass")).toBe(true)
    expect(roleMatchesFilter("Piano", "trumpet")).toBe(false)
  })

  it("filters and deduplicates credits using normalized names and roles", () => {
    expect(
      filterCreditsByRole(credits, "trumpet").map((credit) => credit.name)
    ).toEqual(["Miles Davis"])
    expect(dedupeCredits(credits).map((credit) => credit.name)).toEqual([
      "Tony Williams",
      "Bobby Hutcherson",
      "Miles Davis",
      "Teo Macero",
    ])
  })
})

describe("getPersonAlbumCredits", () => {
  const albumTracks: TrackItem[] = [
    { position: "", type_: "heading", title: "Side A" },
    ...tracks,
  ]

  it("expands range credits and merges track-level credits per track", () => {
    const credits = getPersonAlbumCredits(
      "Tony Williams",
      [
        ...albumTracks.slice(0, 5),
        {
          ...albumTracks[5],
          extraartists: [{ name: "Tony Williams (2)", role: "Percussion" }],
        },
      ],
      [
        { name: "Tony Williams (2)", role: "Drums", tracks: "A1 to B1" },
        { name: "Wayne Shorter", role: "Saxophone" },
      ]
    )

    expect(
      credits?.tracks.map(({ track, roles }) => [track.position, roles])
    ).toEqual([
      ["A1", ["Drums"]],
      ["A2", ["Drums"]],
      ["B1", ["Drums"]],
      ["B3", ["Percussion"]],
    ])
    expect(credits?.albumRoles).toEqual([])
  })

  it("applies album-wide performance credits to every track and keeps other album roles separate", () => {
    const credits = getPersonAlbumCredits("Teo Macero", albumTracks, [
      { name: "Teo Macero", role: "Producer" },
      { name: "Teo Macero", role: "Saxophone" },
    ])

    expect(credits?.tracks).toHaveLength(5)
    expect(credits?.tracks[0].roles).toEqual(["Saxophone"])
    expect(credits?.albumRoles).toEqual(["Producer"])
  })

  it("matches name variations and partial names", () => {
    expect(creditMatchesPerson({ name: "Herbie Hancock" }, "hancock")).toBe(true)
    expect(
      creditMatchesPerson({ name: "Anthony Williams", anv: "Tony Williams" }, "Tony Williams")
    ).toBe(true)
    expect(creditMatchesPerson({ name: "Tony Williams" }, "Tony Allen")).toBe(false)
    expect(creditMatchesPerson({ name: "Tony Williams" }, "")).toBe(false)
  })

  it("returns null when the person is not credited", () => {
    expect(
      getPersonAlbumCredits("Ron Carter", albumTracks, [
        { name: "Tony Williams", role: "Drums" },
      ])
    ).toBeNull()
  })
})
