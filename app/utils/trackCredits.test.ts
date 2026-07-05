import { describe, expect, it } from "vitest"

import type { TrackItem } from "../types"
import {
  creditAppliesToTrack,
  findBestTrackMatch,
  getTrackCredits,
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
