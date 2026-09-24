import { useMemo } from "react"
import {
  isRouteErrorResponse,
  Link as RouterLink,
  useLoaderData,
  useRouteError,
} from "react-router"
import { Box, Button, Divider, SimpleGrid } from "@chakra-ui/react"

import { AppIcon } from "~/components/AppIcon"
import { FavoriteButton } from "~/components/FavoriteButton"
import { AlbumErrorState } from "~/components/album/AlbumErrorState"
import { AlbumHeader } from "~/components/album/AlbumHeader"
import { CreditList } from "~/components/album/CreditList"
import { DetailBreadcrumb } from "~/components/album/DetailBreadcrumb"
import { Panel } from "~/components/album/Panel"
import { RoleFilterLinks } from "~/components/album/RoleFilterLinks"
import { SectionTitle } from "~/components/album/SectionTitle"
import { TrackList } from "~/components/album/TrackList"
import { VideoList } from "~/components/album/VideoList"
import type { ReleaseApiData } from "~/server/data"
import {
  buildAlbumPageMeta,
  buildSearchListHref,
  getArtistName,
  getCoverImage,
  getMatchingVideos,
  getThumbnailImage,
  pickSelectedTrack,
} from "~/utils/albumDetail"
import { api, getApiErrorMessage, toQueryObject } from "~/utils/apiClient"
import { buildPlaybackQuery } from "~/utils/streaming"
import {
  filterCreditsByRole,
  getRoleFilterOptions,
  getTrackCredits,
  isPerformanceRole,
} from "~/utils/trackCredits"

type LoaderData = ReleaseApiData

export async function clientLoader({
  params,
  request,
}: {
  params: { Id: string }
  request: Request
}) {
  const url = new URL(request.url)
  const albumId = params.Id

  if (!albumId) {
    throw new Response("Album ID is required", { status: 400 })
  }

  const response = await api.api.releases({ id: albumId }).get({
    query: toQueryObject(url.searchParams),
  })

  if (response.error) {
    throw new Response(
      getApiErrorMessage(response.error, "Failed to fetch album data."),
      { status: response.status }
    )
  }

  const data = response.data as unknown as LoaderData | null

  if (!data) {
    throw new Response("Failed to fetch album data.", { status: 500 })
  }

  return data
}

export function meta({ data }: { data?: LoaderData }) {
  return buildAlbumPageMeta(data)
}

export function ErrorBoundary() {
  const error = useRouteError()

  return (
    <AlbumErrorState
      status={isRouteErrorResponse(error) ? error.status : 500}
      message={
        isRouteErrorResponse(error)
          ? String(error.data)
          : "Could not load album details."
      }
    />
  )
}

export default function AlbumView() {
  const {
    master,
    release,
    selectedTrackPosition,
    searchQuery,
    roleFilter,
    backQuery,
    detailId,
    detailKind,
  } = useLoaderData<LoaderData>()
  const location = { detailId, detailKind, backQuery }
  const tracks = useMemo(
    () => release.tracklist || master.tracklist || [],
    [master.tracklist, release.tracklist]
  )
  const selectedTrack = useMemo(
    () => pickSelectedTrack(tracks, selectedTrackPosition, searchQuery),
    [searchQuery, selectedTrackPosition, tracks]
  )
  const selectedCredits = getTrackCredits(
    selectedTrack,
    tracks,
    release.extraartists
  )
  const performanceCredits = selectedCredits.filter((credit) =>
    isPerformanceRole(credit.role)
  )
  const visiblePerformanceCredits = filterCreditsByRole(
    performanceCredits,
    roleFilter
  )
  const otherCredits = selectedCredits.filter(
    (credit) => !isPerformanceRole(credit.role)
  )
  const artistName = getArtistName(release, master)
  const videos = getMatchingVideos(release.videos || [], selectedTrack?.title)

  return (
    <Box maxW="1040px" mx="auto">
      <DetailBreadcrumb albumTitle={release.title} backQuery={backQuery} />
      <AlbumHeader
        title={release.title}
        artistName={artistName}
        year={release.year}
        coverImage={getCoverImage(release, master) || undefined}
        discogsUri={release.uri}
        playQuery={buildPlaybackQuery(
          artistName,
          selectedTrack?.title || release.title
        )}
        selectedTrack={selectedTrack}
        actions={
          <FavoriteButton
            album={{
              id: detailId,
              kind: detailKind,
              title: release.title,
              artist: artistName || undefined,
              year: release.year ? String(release.year) : undefined,
              thumb: getThumbnailImage(release, master) || undefined,
              credit: new URLSearchParams(backQuery).get("credit") || undefined,
              song: searchQuery || undefined,
            }}
          />
        }
        performerSummary={
          roleFilter
            ? `${visiblePerformanceCredits.length}/${performanceCredits.length} performers`
            : `${performanceCredits.length} performers`
        }
      />

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5} mt={6}>
        <Panel>
          <SectionTitle>Performers</SectionTitle>
          <RoleFilterLinks
            location={location}
            activeRole={roleFilter}
            roles={getRoleFilterOptions(performanceCredits)}
          />
          <CreditList
            credits={visiblePerformanceCredits}
            emptyText={
              roleFilter
                ? `No ${roleFilter} credits were found for this track.`
                : "No performer credits were found for this track."
            }
          />

          {otherCredits.length > 0 && (
            <Box mt={5}>
              <SectionTitle>Credits</SectionTitle>
              <CreditList credits={otherCredits} />
            </Box>
          )}

          {videos.length > 0 && (
            <Box mt={5}>
              <SectionTitle>Videos</SectionTitle>
              <VideoList videos={videos} />
            </Box>
          )}
        </Panel>

        <Panel>
          <SectionTitle>Tracks</SectionTitle>
          <TrackList
            location={location}
            tracks={tracks}
            selectedPosition={selectedTrack?.position}
          />
        </Panel>
      </SimpleGrid>

      <Divider my={6} />
      <Button
        as={RouterLink}
        to={buildSearchListHref(backQuery)}
        leftIcon={<AppIcon name="arrowLeft" size={15} />}
        variant="link"
      >
        Back to List
      </Button>
    </Box>
  )
}
