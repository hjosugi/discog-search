import {
  Box,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useBreakpointValue,
} from "@chakra-ui/react"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { Panel } from "./Panel"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * Performers and Tracks side by side on wide screens. On narrow screens they
 * become two tabs, so switching tracks and reading the credits never needs a
 * long scroll past the other list: choosing a track returns to the
 * Performers tab and keeps it in view.
 */
export function AlbumSections({
  performers,
  tracks,
  trackCount,
  selectedPosition,
}: {
  performers: ReactNode
  tracks: ReactNode
  trackCount: number
  selectedPosition?: string
}) {
  const { t } = useI18n()
  const layout = useBreakpointValue(
    { base: "tabs", lg: "columns" } as const,
    { ssr: false }
  )
  const [tabIndex, setTabIndex] = useState(0)
  const tabsRef = useRef<HTMLDivElement>(null)
  const previousPosition = useRef(selectedPosition)

  useEffect(() => {
    if (previousPosition.current === selectedPosition) return
    previousPosition.current = selectedPosition
    setTabIndex(0)

    const tabs = tabsRef.current
    if (layout === "tabs" && tabs && tabs.getBoundingClientRect().top < 0) {
      tabs.scrollIntoView({ block: "start" })
    }
  }, [layout, selectedPosition])

  if (layout !== "tabs") {
    return (
      <SimpleGrid columns={2} spacing={5} mt={6}>
        <Panel>{performers}</Panel>
        <Panel>{tracks}</Panel>
      </SimpleGrid>
    )
  }

  return (
    <Box ref={tabsRef} mt={5} scrollMarginTop={2}>
      <Tabs
        index={tabIndex}
        onChange={setTabIndex}
        isFitted
        variant="enclosed-colored"
      >
        <TabList aria-label={t("album.tabs.label")}>
          <Tab minH="44px" fontWeight="semibold">
            {t("album.performers")}
          </Tab>
          <Tab minH="44px" fontWeight="semibold">
            {t("album.tracksCount", { count: trackCount })}
          </Tab>
        </TabList>
        <TabPanels
          bg="bg.surface"
          borderWidth="1px"
          borderTopWidth={0}
          borderColor="border.default"
          borderBottomRadius="md"
        >
          <TabPanel px={3} py={4}>
            {performers}
          </TabPanel>
          <TabPanel px={3} py={4}>
            {tracks}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
