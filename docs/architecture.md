# Architecture

## Search Flow

The main search page lives in `app/routes/search._index.tsx`.

The UI uses three inputs:

- `credit`: a performer, sideman, producer, arranger, or other Discogs credit.
- `song`: a track title.
- `genre`: an optional broad Discogs genre filter.
- `role`: an optional local instrument/role filter such as `drums` or `bass`.

The URL uses `credit` as the primary query parameter. Older `person` links are
still accepted as a fallback so existing links keep working.

## Discogs Request Model

The app does not use a dedicated Discogs "personnel" endpoint. Personnel-style
search is implemented through Discogs database search filters:

- `credit=<name>` for people credited on a release or master.
- `track=<title>` for track title matching.
- `genre=<genre>` for genre filtering.
- `type=release` when `credit` or `song` is present.

The `role` field is not sent to Discogs search because the public search API
does not provide a reliable instrument-role filter. It is carried through the
URL and applied on the detail page against `extraartists.role`.

Discogs' public data model is release-oriented. The search API can filter by
`credit`, but it does not answer "who played drums on this exact track?" in one
request. The app therefore uses a two-stage approach:

1. Search releases with `credit`, `track`, and `genre` filters.
2. Open the selected release/master detail and inspect `extraartists` on the
   release and selected track.

The UI used to call this field `person`, but that name was misleading because
the Discogs request parameter is `credit`. The app now writes `credit` in URLs
and still reads old `person` links as a compatibility fallback.

`type=release` is intentional: release records usually contain the useful
tracklist and credit detail needed to answer questions like "which albums has
Tony Williams appeared on as a sideman?"

The request builder is centralized in `app/utils/discogsSearch.ts`. It first
tries a precise `track` search. If that returns no results for a song search, it
falls back to `q=<song>` because Discogs track metadata can be uneven.

## Ranking

`app/utils/searchRanking.ts` deduplicates similar releases and scores results by:

- song title match strength,
- credit token matches in searchable metadata,
- genre/style match,
- release metadata quality such as year, image, and album-like format.

This ranking is deliberately lightweight. It improves default ordering without
pretending Discogs credits are perfectly normalized.

## Detail Flow

Album detail pages live in `app/routes/search.$Id.tsx`.

Search results can link to either a release or a master. Release results carry
`kind=release` in the URL. The detail loader then:

- fetches `releases/{id}` for release results,
- fetches `masters/{master_id}` when the release points to a master,
- falls back to the master or main release when needed,
- selects the requested track or best matching track title,
- merges track-level and release-level credits for that selected track.

Release-level credits may include a `tracks` range. The detail page checks that
range before showing the credit for a selected track.

The detail page can also filter performer credits by `role`. This is a local
filter over the loaded release metadata, so role chips like `drums`, `bass`,
and `guitar` refine what is shown without changing the upstream Discogs search
request.

## Discogs Fetch Layer

`app/utils/discogsAuthMiddleware.ts` wraps Discogs API calls. It handles:

- `DISCOGS_TOKEN` auth, with key/secret fallback,
- query string construction,
- a 10 minute in-memory response cache,
- pending request coalescing,
- a short global cooldown after HTTP 429 responses,
- typed `DiscogsFetchError` values for route-level error handling.

This keeps API failures from becoming Remix application errors and reduces
repeat calls during typing and navigation.

## React Router v7

The app runs on React Router v7 Framework Mode. The important framework pieces
are:

- `react-router dev` and `react-router build` scripts.
- `reactRouter()` in `vite.config.ts`.
- `app/routes.ts` config routes via `@react-router/dev/routes`.
- `react-router.config.ts` for framework config.
- `HydratedRouter` and `ServerRouter` in the entry files.
- Node 20+ is required.
- TypeScript uses bundler module resolution and generated React Router route
  types.
