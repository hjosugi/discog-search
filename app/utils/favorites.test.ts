import { describe, expect, it } from "vitest"

import {
  addFavorite,
  buildFavoriteHref,
  isFavoriteAlbum,
  MAX_FAVORITES,
  parseFavorites,
  removeFavorite,
  toggleFavorite,
  type FavoriteAlbum,
} from "./favorites"
import { createFavoritesStore, type FavoritesStorage } from "../hooks/useFavorites"

const nefertiti = {
  id: "1001",
  kind: "release" as const,
  title: "Miles Davis - Nefertiti",
  artist: "Miles Davis",
  year: "1968",
  credit: "Tony Williams",
  song: "Nefertiti",
}

describe("favorites", () => {
  it("adds, detects, and removes favorites by kind and id", () => {
    const saved = addFavorite([], nefertiti, 10)

    expect(saved).toEqual([{ ...nefertiti, thumb: undefined, savedAt: 10 }])
    expect(isFavoriteAlbum(saved, { id: "1001", kind: "release" })).toBe(true)
    expect(isFavoriteAlbum(saved, { id: "1001", kind: "master" })).toBe(false)
    expect(removeFavorite(saved, nefertiti)).toEqual([])
  })

  it("moves a re-saved album to the front instead of duplicating it", () => {
    const other = { ...nefertiti, id: "2002", title: "Other" }
    const entries = addFavorite(addFavorite([], nefertiti, 1), other, 2)

    const resaved = addFavorite(entries, { ...nefertiti, song: "Fall" }, 3)

    expect(resaved.map((entry) => [entry.id, entry.song])).toEqual([
      ["1001", "Fall"],
      ["2002", "Nefertiti"],
    ])
  })

  it("toggles favorites", () => {
    const saved = toggleFavorite([], nefertiti, 1)
    expect(saved).toHaveLength(1)
    expect(toggleFavorite(saved, nefertiti)).toEqual([])
  })

  it("caps the list size", () => {
    let entries: FavoriteAlbum[] = []
    for (let index = 0; index < MAX_FAVORITES + 5; index += 1) {
      entries = addFavorite(entries, { ...nefertiti, id: String(index) }, index)
    }
    expect(entries).toHaveLength(MAX_FAVORITES)
    expect(entries[0].id).toBe(String(MAX_FAVORITES + 4))
  })

  it("parses stored data defensively", () => {
    expect(parseFavorites("nope")).toEqual([])
    expect(
      parseFavorites([
        { id: 1001, kind: "release", title: "A", savedAt: 5 },
        { id: "1001", kind: "release", title: "Duplicate" },
        { id: "abc", kind: "release", title: "Bad id" },
        { id: "3", kind: "artist", title: "Bad kind" },
        { id: "4", kind: "master" },
        null,
      ])
    ).toEqual([
      {
        id: "1001",
        kind: "release",
        title: "A",
        artist: undefined,
        year: undefined,
        thumb: undefined,
        credit: undefined,
        song: undefined,
        savedAt: 5,
      },
    ])
  })

  it("links back to the detail page with the saved search memo", () => {
    expect(buildFavoriteHref({ ...nefertiti, savedAt: 1 })).toBe(
      "/search/1001?credit=Tony+Williams&song=Nefertiti&kind=release"
    )
    expect(
      buildFavoriteHref({ id: "42", kind: "master", title: "M", savedAt: 1 })
    ).toBe("/search/42")
  })
})

describe("createFavoritesStore", () => {
  function memoryStorage(initial: FavoriteAlbum[] = []) {
    let stored = initial
    let external: (() => void) | null = null
    const storage: FavoritesStorage = {
      read: () => stored,
      write: (entries) => {
        stored = entries
      },
      subscribe: (listener) => {
        external = listener
        return () => {
          external = null
        }
      },
    }
    return {
      storage,
      setExternally(entries: FavoriteAlbum[]) {
        stored = entries
        external?.()
      },
      get stored() {
        return stored
      },
    }
  }

  it("persists changes and notifies subscribers", () => {
    const backing = memoryStorage()
    const store = createFavoritesStore(backing.storage)
    let notifications = 0
    const unsubscribe = store.subscribe(() => {
      notifications += 1
    })

    store.toggle(nefertiti)

    expect(store.getSnapshot()).toHaveLength(1)
    expect(backing.stored).toHaveLength(1)
    expect(notifications).toBe(1)
    unsubscribe()
  })

  it("picks up changes made in another tab", () => {
    const backing = memoryStorage()
    const store = createFavoritesStore(backing.storage)
    const unsubscribe = store.subscribe(() => {})

    backing.setExternally([{ ...nefertiti, savedAt: 1 }])

    expect(store.getSnapshot().map((entry) => entry.id)).toEqual(["1001"])
    unsubscribe()
  })
})
