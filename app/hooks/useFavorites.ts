import { useCallback, useSyncExternalStore } from "react"

import {
  FAVORITES_STORAGE_KEY,
  isFavoriteAlbum,
  parseFavorites,
  removeFavorite,
  toggleFavorite,
  type FavoriteAlbum,
  type FavoriteAlbumInput,
} from "../utils/favorites"

/**
 * Persistence boundary for favorites. The app ships a localStorage
 * implementation; an account-synced store only has to implement this
 * interface.
 */
export interface FavoritesStorage {
  read(): FavoriteAlbum[]
  write(entries: FavoriteAlbum[]): void
  /** Notifies when entries change outside this tab (e.g. another tab). */
  subscribe(onExternalChange: () => void): () => void
}

export function createLocalStorageFavorites(
  key = FAVORITES_STORAGE_KEY
): FavoritesStorage {
  return {
    read() {
      if (typeof window === "undefined") return []
      try {
        const value = window.localStorage.getItem(key)
        return value ? parseFavorites(JSON.parse(value)) : []
      } catch {
        return []
      }
    },
    write(entries) {
      if (typeof window === "undefined") return
      try {
        window.localStorage.setItem(key, JSON.stringify(entries))
      } catch {
        // Ignore quota and private-mode failures; favorites stay in memory.
      }
    },
    subscribe(onExternalChange) {
      if (typeof window === "undefined") return () => {}
      const handleStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) onExternalChange()
      }
      window.addEventListener("storage", handleStorage)
      return () => window.removeEventListener("storage", handleStorage)
    },
  }
}

/**
 * A tiny external store so every component (result cards, detail page,
 * header count, favorites page) shares one list and re-renders together.
 */
export function createFavoritesStore(storage: FavoritesStorage) {
  let entries: FavoriteAlbum[] | null = null
  let stopStorageSubscription: (() => void) | null = null
  const listeners = new Set<() => void>()
  const emptyEntries: FavoriteAlbum[] = []

  const load = () => {
    if (entries === null) entries = storage.read()
    return entries
  }
  const emit = () => listeners.forEach((listener) => listener())
  const update = (next: FavoriteAlbum[]) => {
    entries = next
    storage.write(next)
    emit()
  }

  return {
    getSnapshot: load,
    getServerSnapshot: () => emptyEntries,
    subscribe(listener: () => void) {
      listeners.add(listener)
      stopStorageSubscription ??= storage.subscribe(() => {
        entries = storage.read()
        emit()
      })
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          stopStorageSubscription?.()
          stopStorageSubscription = null
        }
      }
    },
    toggle(album: FavoriteAlbumInput) {
      update(toggleFavorite(load(), album))
    },
    remove(album: { id: string; kind: FavoriteAlbum["kind"] }) {
      update(removeFavorite(load(), album))
    },
    clear() {
      update([])
    },
  }
}

const favoritesStore = createFavoritesStore(createLocalStorageFavorites())

export function useFavorites() {
  const entries = useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.getSnapshot,
    favoritesStore.getServerSnapshot
  )
  const isFavorite = useCallback(
    (album: { id: string; kind: FavoriteAlbum["kind"] }) =>
      isFavoriteAlbum(entries, album),
    [entries]
  )

  return {
    entries,
    isFavorite,
    toggleFavorite: favoritesStore.toggle,
    removeFavorite: favoritesStore.remove,
    clearFavorites: favoritesStore.clear,
  }
}
