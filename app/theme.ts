import { extendTheme, type ThemeConfig } from "@chakra-ui/react"

const config: ThemeConfig = {
  // "system" until the user picks Light or Dark; see app/colorMode.ts.
  initialColorMode: "system",
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
      "bg.canvas": { default: "gray.50", _dark: "gray.900" },
      "bg.surface": { default: "white", _dark: "gray.800" },
      "bg.subtle": { default: "gray.50", _dark: "whiteAlpha.50" },
      "bg.muted": { default: "gray.100", _dark: "whiteAlpha.100" },
      "bg.accent": { default: "blue.50", _dark: "blue.900" },
      "bg.selected": { default: "blue.50", _dark: "blue.900" },
      "border.default": { default: "gray.200", _dark: "whiteAlpha.200" },
      "border.selected": { default: "blue.200", _dark: "blue.500" },
      "border.hover": { default: "blue.300", _dark: "blue.400" },
      "text.default": { default: "gray.900", _dark: "whiteAlpha.900" },
      "text.secondary": { default: "gray.700", _dark: "gray.200" },
      "text.muted": { default: "gray.600", _dark: "gray.400" },
      "text.subtle": { default: "gray.500", _dark: "gray.400" },
      "text.icon": { default: "gray.400", _dark: "gray.500" },
      "text.accent": { default: "blue.600", _dark: "blue.300" },
      "text.link": { default: "blue.700", _dark: "blue.300" },
      "text.linkHover": { default: "blue.800", _dark: "blue.200" },
      "logo.bg": { default: "black", _dark: "gray.100" },
      "logo.fg": { default: "white", _dark: "gray.900" },
    },
  },
  components: {
    Button: {
      variants: {
        // Chakra's light-mode solid buttons use the 500 shade, which puts white
        // text below the WCAG AA 4.5:1 contrast ratio for blue, red, and green.
        // Use the 600 shade (and darker hover/active) instead.
        solid: ({
          colorScheme: c,
          colorMode,
        }: {
          colorScheme: string
          colorMode: "light" | "dark"
        }) => {
          if (c === "gray" || colorMode === "dark") return {}
          return {
            bg: `${c}.600`,
            _hover: { bg: `${c}.700`, _disabled: { bg: `${c}.600` } },
            _active: { bg: `${c}.800` },
          }
        },
        // The link variant's 500 shade (e.g. gray.500 on white, 4.0:1) is also
        // below AA for body-size text.
        link: ({
          colorScheme: c,
          colorMode,
        }: {
          colorScheme: string
          colorMode: "light" | "dark"
        }) =>
          colorMode === "dark"
            ? {}
            : { color: `${c}.600`, _active: { color: `${c}.800` } },
      },
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
