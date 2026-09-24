import {
  IconButton,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  useColorMode,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"

import { AppIcon } from "./AppIcon"
import {
  isColorModePreference,
  readColorModePreference,
  subscribeToSystemColorMode,
  writeColorModePreference,
  type ColorModePreference,
} from "../colorMode"
import { useI18n } from "../i18n/I18nProvider"

const OPTIONS = [
  { value: "light", icon: "sun", label: "theme.light" },
  { value: "dark", icon: "moon", label: "theme.dark" },
  { value: "system", icon: "monitor", label: "theme.system" },
] as const

/** Light / Dark / System switch. "System" keeps following OS changes. */
export function ColorModeMenu() {
  const { t } = useI18n()
  const { colorMode, setColorMode } = useColorMode()
  const [preference, setPreference] = useState<ColorModePreference>("system")

  useEffect(() => {
    setPreference(readColorModePreference())
  }, [])

  useEffect(() => {
    if (preference !== "system") return
    return subscribeToSystemColorMode((isDark) =>
      setColorMode(isDark ? "dark" : "light")
    )
  }, [preference, setColorMode])

  const choose = (value: ColorModePreference) => {
    writeColorModePreference(value)
    setPreference(value)
    setColorMode(value)
  }

  return (
    <Menu placement="bottom-end" isLazy>
      <MenuButton
        as={IconButton}
        aria-label={t("theme.label")}
        title={t("theme.label")}
        icon={<AppIcon name={colorMode === "dark" ? "moon" : "sun"} size={17} />}
        size="sm"
        variant="ghost"
      />
      <MenuList minW="10rem">
        <MenuOptionGroup
          type="radio"
          value={preference}
          onChange={(value) => {
            if (isColorModePreference(value)) choose(value)
          }}
        >
          {OPTIONS.map((option) => (
            <MenuItemOption key={option.value} value={option.value}>
              <AppIcon name={option.icon} size={15} style={{ display: "inline", marginRight: 8, verticalAlign: "-2px" }} />
              {t(option.label)}
            </MenuItemOption>
          ))}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}
