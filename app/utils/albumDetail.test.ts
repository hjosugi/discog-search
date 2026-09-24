import { describe, expect, it } from "vitest"

import {
  buildCreditSearchPath,
  buildDetailHref,
  buildSearchListHref,
  getMatchingVideos,
} from "./albumDetail"
import { buildPlaybackQuery, buildStreamingLinks } from "./streaming"

describe("album detail links", () => {
  const location = {
    detailId: "1001",
    detailKind: "release" as const,
    backQuery: "credit=Tony+Williams&role=drums",
  }

  it("keeps the search context and release kind when changing a parameter", () => {
    expect(buildDetailHref(location, { track: "A2" })).toBe(
      "/search/1001?credit=Tony+Williams&role=drums&track=A2&kind=release"
    )
  })

  it("removes parameters set to null", () => {
    expect(
      buildDetailHref({ ...location, detailKind: "master" }, { role: null })
    ).toBe("/search/1001?credit=Tony+Williams")
  })

  it("builds list and credit search links", () => {
    expect(buildSearchListHref("")).toBe("/search")
    expect(buildSearchListHref("credit=Ron+Carter")).toBe(
      "/search?credit=Ron+Carter"
    )
    expect(buildCreditSearchPath("Ron Carter")).toBe("/search?credit=Ron+Carter")
  })
})

describe("getMatchingVideos", () => {
  const videos = [
    { uri: "https://youtu.be/a", title: "Miles Davis - Fall" },
    { uri: "https://youtu.be/b", title: "Miles Davis – Nefertiti (Remastered)" },
  ]

  it("prefers videos that mention the selected track", () => {
    expect(getMatchingVideos(videos, "Nefertiti")).toEqual([videos[1]])
  })

  it("falls back to the first videos when nothing matches", () => {
    expect(getMatchingVideos(videos, "Pinocchio")).toEqual(videos)
  })
})

describe("streaming links", () => {
  it("builds a playback query from the primary artist and clean track title", () => {
    expect(
      buildPlaybackQuery("Miles Davis Quintet, Wayne Shorter", "Nefertiti (Take 2)")
    ).toBe("Miles Davis Quintet Nefertiti")
  })

  it("encodes the query into each service URL", () => {
    expect(buildStreamingLinks("A & B").map((link) => link.href)).toEqual([
      "https://music.apple.com/us/search?term=A%20%26%20B",
      "https://open.spotify.com/search/A%20%26%20B",
      "https://music.youtube.com/search?q=A%20%26%20B",
    ])
  })
})
