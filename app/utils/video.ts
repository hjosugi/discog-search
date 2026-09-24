const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
])

/**
 * Extracts the video id from the YouTube URL shapes Discogs stores
 * (watch?v=, youtu.be/, /embed/, /shorts/, /live/, /v/). Returns null for
 * anything that is not a YouTube video URL.
 */
export function getYouTubeVideoId(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null

  const host = url.hostname.toLowerCase()
  let id: string | null = null

  if (host === "youtu.be" || host === "www.youtu.be") {
    id = url.pathname.split("/")[1] || null
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v")
    } else {
      const [, section, candidate] = url.pathname.split("/")
      if (["embed", "shorts", "live", "v"].includes(section)) {
        id = candidate || null
      }
    }
  }

  return id && YOUTUBE_ID.test(id) ? id : null
}

/** Privacy-enhanced player URL; only requested after the user presses play. */
export function buildYouTubeEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`
}

export function buildYouTubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

/** 472 -> "7:52", 3725 -> "1:02:05" */
export function formatVideoDuration(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return ""

  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = String(total % 60).padStart(2, "0")

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}`
    : `${minutes}:${secs}`
}
