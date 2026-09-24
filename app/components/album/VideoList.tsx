import { Link, VStack } from "@chakra-ui/react"

import type { DiscogsVideo } from "~/types"

export function VideoList({ videos }: { videos: DiscogsVideo[] }) {
  return (
    <VStack align="stretch" spacing={2}>
      {videos.map((video) => (
        <Link
          key={video.uri}
          href={video.uri}
          target="_blank"
          rel="noreferrer"
          color="text.accent"
          fontSize="sm"
        >
          {video.title}
        </Link>
      ))}
    </VStack>
  )
}
