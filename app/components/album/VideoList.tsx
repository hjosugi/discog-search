import {
  AspectRatio,
  Box,
  HStack,
  Image,
  Link,
  SimpleGrid,
  Text,
} from "@chakra-ui/react"
import { useState } from "react"

import { AppIcon } from "../AppIcon"
import { useI18n } from "~/i18n/I18nProvider"
import type { DiscogsVideo } from "~/types"
import {
  buildYouTubeEmbedUrl,
  buildYouTubeThumbnailUrl,
  formatVideoDuration,
  getYouTubeVideoId,
} from "~/utils/video"

export function VideoList({ videos }: { videos: DiscogsVideo[] }) {
  return (
    <SimpleGrid minChildWidth="220px" spacing={3}>
      {videos.map((video) => {
        const youTubeId = getYouTubeVideoId(video.uri)

        return youTubeId ? (
          <YouTubeLiteEmbed key={video.uri} video={video} videoId={youTubeId} />
        ) : (
          <ExternalVideoLink key={video.uri} video={video} />
        )
      })}
    </SimpleGrid>
  )
}

/**
 * Shows a static thumbnail and loads the youtube-nocookie iframe only after
 * the user presses play. The 16:9 box is reserved up front, so swapping the
 * thumbnail for the player does not shift the layout.
 */
function YouTubeLiteEmbed({
  video,
  videoId,
}: {
  video: DiscogsVideo
  videoId: string
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const { t } = useI18n()
  const duration = formatVideoDuration(video.duration)

  return (
    <Box>
      <AspectRatio ratio={16 / 9} borderRadius="md" overflow="hidden" bg="black">
        {isPlaying ? (
          <iframe
            src={buildYouTubeEmbedUrl(videoId)}
            title={t("album.video.player", { title: video.title })}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{ border: 0 }}
          />
        ) : (
          <Box
            as="button"
            type="button"
            aria-label={t("album.video.play", { title: video.title })}
            onClick={() => setIsPlaying(true)}
            position="relative"
            cursor="pointer"
            data-group=""
          >
            <Image
              src={buildYouTubeThumbnailUrl(videoId)}
              alt=""
              loading="lazy"
              decoding="async"
              objectFit="cover"
              w="100%"
              h="100%"
            />
            <Box
              position="absolute"
              inset={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box
                alignItems="center"
                bg="blackAlpha.700"
                borderRadius="full"
                color="white"
                display="flex"
                h="52px"
                justifyContent="center"
                transition="background-color 120ms ease"
                w="52px"
                _groupHover={{ bg: "red.600" }}
                _groupFocusVisible={{ bg: "red.600" }}
              >
                <AppIcon name="play" size={24} fill="currentColor" strokeWidth={0} />
              </Box>
            </Box>
            {duration && (
              <Text
                position="absolute"
                right={2}
                bottom={2}
                bg="blackAlpha.800"
                color="white"
                fontSize="xs"
                px={1.5}
                borderRadius="sm"
              >
                {duration}
              </Text>
            )}
          </Box>
        )}
      </AspectRatio>
      <Link
        href={video.uri}
        target="_blank"
        rel="noreferrer"
        color="text.link"
        fontSize="sm"
        mt={1}
        display="block"
        noOfLines={2}
      >
        {video.title}
      </Link>
    </Box>
  )
}

function ExternalVideoLink({ video }: { video: DiscogsVideo }) {
  const duration = formatVideoDuration(video.duration)

  return (
    <Link
      href={video.uri}
      target="_blank"
      rel="noreferrer"
      color="text.link"
      fontSize="sm"
      alignSelf="start"
    >
      <HStack as="span" spacing={1} align="start">
        <Box as="span" mt="3px" flexShrink={0}>
          <AppIcon name="external" size={14} />
        </Box>
        <Text as="span">
          {video.title}
          {duration ? ` (${duration})` : ""}
        </Text>
      </HStack>
    </Link>
  )
}
