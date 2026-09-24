import { IconButton, type IconButtonProps } from "@chakra-ui/react"

import { AppIcon } from "./AppIcon"
import { useFavorites } from "../hooks/useFavorites"
import { useI18n } from "../i18n/I18nProvider"
import type { FavoriteAlbumInput } from "../utils/favorites"

export function FavoriteButton({
  album,
  size = "sm",
  ...props
}: {
  album: FavoriteAlbumInput
} & Omit<IconButtonProps, "aria-label" | "icon" | "onClick">) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const { t } = useI18n()
  const isSaved = isFavorite(album)
  const label = isSaved
    ? t("favorite.remove", { title: album.title })
    : t("favorite.save", { title: album.title })

  return (
    <IconButton
      aria-label={label}
      aria-pressed={isSaved}
      title={isSaved ? t("favorite.removeShort") : t("favorite.saveShort")}
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
