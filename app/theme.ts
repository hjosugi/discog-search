import { extendTheme, type ThemeConfig } from "@chakra-ui/react"

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
}

/**
 * Chakra UI is the single styling system for the app. Components use these
 * semantic tokens instead of raw palette values (`white`, `gray.200`, ...), so
 * surface, border, and text colors are defined in exactly one place.
 */
export const theme = extendTheme({
  config,
  semanticTokens: {
    colors: {
      "bg.canvas": { default: "gray.50" },
      "bg.surface": { default: "white" },
      "bg.subtle": { default: "gray.50" },
      "bg.muted": { default: "gray.100" },
      "bg.accent": { default: "blue.50" },
      "bg.selected": { default: "blue.50" },
      "border.default": { default: "gray.200" },
      "border.selected": { default: "blue.200" },
      "border.hover": { default: "blue.300" },
      "text.default": { default: "gray.900" },
      "text.secondary": { default: "gray.700" },
      "text.muted": { default: "gray.600" },
      "text.subtle": { default: "gray.500" },
      "text.icon": { default: "gray.400" },
      "text.accent": { default: "blue.600" },
      "text.link": { default: "blue.700" },
      "text.linkHover": { default: "blue.800" },
      "logo.bg": { default: "black" },
      "logo.fg": { default: "white" },
    },
  },
  styles: {
    global: {
      "html, body": {
        bg: "bg.canvas",
      },
    },
  },
})
