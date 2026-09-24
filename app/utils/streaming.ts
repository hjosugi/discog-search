import { cleanSearchText } from "./text"

export type StreamingLink = {
  label: string
  href: string
  colorScheme: string
}

export function buildStreamingLinks(query: string): StreamingLink[] {
  const encoded = encodeURIComponent(query)
  return [
    {
      label: "Apple Music",
      href: `https://music.apple.com/us/search?term=${encoded}`,
      colorScheme: "red",
    },
    {
      label: "Spotify",
      href: `https://open.spotify.com/search/${encoded}`,
      colorScheme: "green",
    },
    {
      label: "YouTube Music",
      href: `https://music.youtube.com/search?q=${encoded}`,
      colorScheme: "red",
    },
  ]
}

/** "Miles Davis Quintet, Wayne Shorter" + "Nefertiti (Take 2)" -> "Miles Davis Quintet Nefertiti" */
export function buildPlaybackQuery(artistName: string, trackTitle: string) {
  return [getPrimaryArtistName(artistName), cleanSearchText(trackTitle)]
    .filter(Boolean)
    .join(" ")
}

function getPrimaryArtistName(artistName: string) {
  return cleanSearchText(artistName.split(/,|\/|;|\s+-\s+/)[0] || artistName)
}
