import { describe, expect, it } from "vitest"

import {
  buildYouTubeEmbedUrl,
  buildYouTubeThumbnailUrl,
  formatVideoDuration,
  getYouTubeVideoId,
} from "./video"

describe("getYouTubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["http://youtube.com/watch?v=dQw4w9WgXcQ&t=42", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("reads %s", (url, id) => {
    expect(getYouTubeVideoId(url)).toBe(id)
  })

  it.each([
    "https://vimeo.com/12345",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/channel/UC1234567890",
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "not a url",
  ])("rejects %s", (url) => {
    expect(getYouTubeVideoId(url)).toBeNull()
  })
})

describe("YouTube URLs", () => {
  it("uses the privacy-enhanced player and static thumbnails", () => {
    expect(buildYouTubeEmbedUrl("dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0"
    )
    expect(buildYouTubeThumbnailUrl("dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    )
  })
})

describe("formatVideoDuration", () => {
  it("formats seconds as clock time", () => {
    expect(formatVideoDuration(472)).toBe("7:52")
    expect(formatVideoDuration(3725)).toBe("1:02:05")
    expect(formatVideoDuration(0)).toBe("")
    expect(formatVideoDuration(undefined)).toBe("")
  })
})
