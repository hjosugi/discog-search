import { IconButton, type IconButtonProps } from "@chakra-ui/react"

import { AppIcon } from "./AppIcon"
import { useFavorites } from "../hooks/useFavorites"
import type { FavoriteAlbumInput } from "../utils/favorites"

export function FavoriteButton({
  album,
  size = "sm",
  ...props
}: {
  album: FavoriteAlbumInput
} & Omit<IconButtonProps, "aria-label" | "icon" | "onClick">) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const isSaved = isFavorite(album)
  const label = isSaved
    ? `Remove ${album.title} from favorites`
    : `Save ${album.title} to favorites`

  return (
    <IconButton
      aria-label={label}
      aria-pressed={isSaved}
      title={isSaved ? "Remove from favorites" : "Save to favorites"}
      icon={
        <AppIcon
          name="star"
          size={size === "sm" ? 17 : 19}
          fill={isSaved ? "currentColor" : "none"}
        />
      }
      color={isSaved ? "yellow.500" : "text.icon"}
      _hover={{ color: isSaved ? "yellow.600" : "text.accent", bg: "bg.subtle" }}
      onClick={() => toggleFavorite(album)}
      size={size}
      variant="ghost"
      {...props}
    />
  )
}
