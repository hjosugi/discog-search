import { useMemo } from "react"
import {
  data as routeData,
  isRouteErrorResponse,
  Link as RouterLink,
  useLoaderData,
  useRouteError,
} from "react-router"
import { Box, Button, Divider } from "@chakra-ui/react"

import { AppIcon } from "~/components/AppIcon"
import { FavoriteButton } from "~/components/FavoriteButton"
import { AlbumErrorState } from "~/components/album/AlbumErrorState"
import { AlbumHeader } from "~/components/album/AlbumHeader"
import { AlbumSections } from "~/components/album/AlbumSections"
import { CreditList } from "~/components/album/CreditList"
import { DetailBreadcrumb } from "~/components/album/DetailBreadcrumb"
import { OtherVersions } from "~/components/album/OtherVersions"
import { Panel } from "~/components/album/Panel"
import { PersonCreditsPanel } from "~/components/album/PersonCreditsPanel"
import { RoleFilterLinks } from "~/components/album/RoleFilterLinks"
import { SectionTitle } from "~/components/album/SectionTitle"
import { TrackList } from "~/components/album/TrackList"
import { VideoList } from "~/components/album/VideoList"
import { getActiveLocale, useI18n } from "~/i18n/I18nProvider"
import { translateApiError } from "~/i18n/locale"
import type { ReleaseApiData } from "~/server/data"
import {
  buildAlbumPageMeta,
  buildSearchListHref,
  getArtistName,
  getCoverImage,
  getMasterId,
  getMatchingVideos,
  getThumbnailImage,
  pickSelectedTrack,
} from "~/utils/albumDetail"
import {
  api,
  getApiErrorCode,
  getApiErrorMessage,
  toQueryObject,
} from "~/utils/apiClient"
import { buildPlaybackQuery } from "~/utils/streaming"
import {
  filterCreditsByRole,
  getPersonAlbumCredits,
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
    throw routeData(
      {
        message: getApiErrorMessage(response.error, "Failed to fetch album data."),
        code: getApiErrorCode(response.error),
      },
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
  return buildAlbumPageMeta(data, getActiveLocale())
}

export function ErrorBoundary() {
  const error = useRouteError()
  const { t } = useI18n()

  return (
    <AlbumErrorState
      status={isRouteErrorResponse(error) ? error.status : 500}
      message={
        isRouteErrorResponse(error)
          ? getRouteErrorMessage(error.data, t)
          : t("error.albumFailed")
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
  const { t } = useI18n()
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
  const masterId = getMasterId(release, master, detailKind)
  const creditSearch = getCreditSearch(backQuery)
  const personCredits = useMemo(
    () =>
      creditSearch
        ? getPersonAlbumCredits(creditSearch, tracks, release.extraartists)
        : null,
    [creditSearch, release.extraartists, tracks]
  )

  return (
    <Box maxW="1040px" mx="auto">
      <DetailBreadcrumb albumTitle={release.title} backQuery={backQuery} />
      {creditSearch && (
        <PersonCreditsPanel
          person={creditSearch}
          credits={personCredits}
          totalTracks={tracks.filter((track) => track.type_ === "track").length}
          selectedPosition={selectedTrack?.position}
          location={location}
        />
      )}
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
              credit: creditSearch || undefined,
              song: searchQuery || undefined,
            }}
          />
        }
        performerSummary={
          roleFilter
            ? t("album.performerCountFiltered", {
                visible: visiblePerformanceCredits.length,
                total: performanceCredits.length,
              })
            : t("album.performerCount", { count: performanceCredits.length })
        }
      />

      <AlbumSections
        trackCount={tracks.filter((track) => track.type_ === "track").length}
        selectedPosition={selectedTrack?.position}
        performers={
          <>
            <SectionTitle>{t("album.performers")}</SectionTitle>
            <RoleFilterLinks
              location={location}
              activeRole={roleFilter}
              roles={getRoleFilterOptions(performanceCredits)}
            />
            <CreditList
              credits={visiblePerformanceCredits}
              highlightPerson={creditSearch}
              emptyText={
                roleFilter
                  ? t("album.noRoleCredits", { role: roleFilter })
                  : t("album.noPerformers")
              }
            />

            {otherCredits.length > 0 && (
              <Box mt={5}>
                <SectionTitle>{t("album.credits")}</SectionTitle>
                <CreditList credits={otherCredits} highlightPerson={creditSearch} />
              </Box>
            )}

            {videos.length > 0 && (
              <Box mt={5}>
                <SectionTitle>{t("album.videos")}</SectionTitle>
                <VideoList videos={videos} />
              </Box>
            )}
          </>
        }
        tracks={
          <>
            <SectionTitle>{t("album.tracks")}</SectionTitle>
            <TrackList
              location={location}
              tracks={tracks}
              selectedPosition={selectedTrack?.position}
            />
          </>
        }
      />

      {masterId && (
        <Panel mt={5}>
          <OtherVersions
            key={masterId}
            masterId={masterId}
            currentReleaseId={release.id}
            backQuery={backQuery}
          />
        </Panel>
      )}

      <Divider my={6} />
      <Button
        as={RouterLink}
        to={buildSearchListHref(backQuery)}
        leftIcon={<AppIcon name="arrowLeft" size={15} />}
        variant="link"
      >
        {t("album.backToList")}
      </Button>
    </Box>
  )
}

function getCreditSearch(backQuery: string) {
  const params = new URLSearchParams(backQuery)
  return (params.get("credit") || params.get("person") || "").trim()
}

function getRouteErrorMessage(
  data: unknown,
  t: ReturnType<typeof useI18n>["t"]
) {
  if (data && typeof data === "object" && "message" in data) {
    const { message, code } = data as { message?: unknown; code?: unknown }
    return translateApiError(
      t,
      typeof code === "string" ? code : undefined,
      typeof message === "string" ? message : t("error.albumFailed")
    )
  }
  return typeof data === "string" && data ? data : t("error.albumFailed")
}
