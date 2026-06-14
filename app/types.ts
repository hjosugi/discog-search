export interface DiscogsArtist {
  id?: number
  name: string
  anv?: string
  join?: string
  role?: string
  tracks?: string
  resource_url?: string
  thumbnail_url?: string
}

export interface DiscogsImage {
  uri?: string
  uri150?: string
  width?: number
  height?: number
  type?: string
}

export interface DiscogsVideo {
  uri: string
  title: string
  description?: string
  duration?: number
  embed?: boolean
export interface AlbumArtist {
  id?: number
  name: string
}

export interface AlbumImage {
  uri: string
}

export interface DiscogsMaster {
  id: number
  title: string
  artists?: AlbumArtist[]
  images?: AlbumImage[]
  year?: number
  tracklist?: TrackItem[]
  extraartists?: ExtraArtist[]
}

export interface Album {
  id: number
  title: string
  artist: string
  thumb: string
  year?: number
}

export interface TrackItem {
  position: string
  type_: string
  title: string
  duration: string
  extraartists?: ExtraArtist[]
}

export interface ExtraArtist {
  name: string
  anv: string
  join: string
  role: string
  tracks: string
  id: number
  resource_url: string
}

export interface SearchParam extends Record<string, string | number | null | undefined> {
  page: number
  q?: string | null
  artist?: string | null
  credit?: string | null
  genre?: string | null
  type: "master"
  per_page: number
}

export interface DiscogsMaster {
  id: number
  title: string
  year?: number
  artists?: DiscogsArtist[]
  images?: DiscogsImage[]
  tracklist?: TrackItem[]
  extraartists?: ExtraArtist[]
  main_release?: number
  uri?: string
}

export interface DiscogsRelease extends DiscogsMaster {
  videos?: DiscogsVideo[]
  artists_sort?: string
}

export interface SearchResult {
  id: number
  title: string
  artist: string
  thumb: string
  country?: string
  year?: string
  format?: string[]
  label?: string[]
  type?: string
  genre?: string[]
  style?: string[]
  barcode?: string[]
  uri?: string
  catno?: string
}

export interface LoaderData {
  results: SearchResult[]
  isSearching: boolean
}
