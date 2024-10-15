export interface Album {
  id: number
  title: string
  artist: string
  thumb: string
  year?: number // 任意のプロパティ
  // 他のプロパティも追加
}

export interface TrackItem {
  position: string
  type_: string
  title: string
  duration: string
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

export interface SearchParam {
  page: number
  q?: string | null
  type: "master"
  per_page: number
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
