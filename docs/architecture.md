# Architecture

## Search Flow

The main search page lives in `app/routes/search._index.tsx`.

The UI uses these search inputs:

- `credit`: a performer, sideman, producer, arranger, or other Discogs credit.
- `song`: a track title.
- `genre`: an optional broad Discogs genre filter.
- `role`: an optional local instrument/role filter such as `drums` or `bass`.
- `year`: an exact Discogs release year.
- `decade`: a local decade refinement over fetched result pages.
- `country`: a Discogs country filter.
- `format`: a Discogs format filter such as `LP` or `CD`.
- `sort`: result ordering, either relevance or year.

The URL uses `credit` as the primary query parameter. Older `person` links are
still accepted as a fallback so existing links keep working.

The important distinction is that `credit` is an upstream Discogs search
parameter, while `role` is not. `credit` can narrow the initial API search.
`role` can only be applied after a release has been loaded and its
`extraartists.role` values are available.

## Discogs Request Model

The app does not use a dedicated Discogs "personnel" endpoint. Personnel-style
search is implemented through Discogs database search filters:

- `credit=<name>` for people credited on a release or master.
- `track=<title>` for track title matching.
- `genre=<genre>` for genre filtering.
- `year=<year>` for exact release year filtering.
- `country=<country>` for country filtering.
- `format=<format>` for format filtering.
- `type=release` when `credit` or `song` is present.

There is intentionally no `personnel=<name>` request in the codebase. Discogs
does not expose the app's target question, "find albums where this person is a
sideman on this track/instrument", as a single stable search request. The app
therefore treats `credit` search as a broad candidate finder and the detail page
as the verification step.

The `role` field is not sent to Discogs search because the public search API
does not provide a reliable instrument-role filter. It is carried through the
URL and applied on the detail page against `extraartists.role`.

The `decade` field is also local. Exact `year` is sent to Discogs, while decade
filters the result pages already loaded by the search route.

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

Search pagination is explicit and URL-backed through `page=<n>`. The route asks
`searchDiscogsAlbums()` to fetch cumulative result pages from page 1 through the
requested page, then renders a "Load more" link for the next page when Discogs
reports more results. The utility caps requested pages to avoid accidental bulk
fetching against the Discogs rate limit. Discogs `pagination.items` is surfaced
as the total match count in the UI.

Example candidate search requests:

```text
database/search?credit=Tony Williams&type=release&per_page=100&page=1
database/search?credit=Tony Williams&track=Night In Tunisia&type=release&per_page=100&page=1
```

Fallback when the track filter is too narrow:

```text
database/search?credit=Tony Williams&q=Night In Tunisia&type=release&per_page=100&page=1
```

## Execution Path

```text
app/routes/search._index.tsx
  loader()
    -> searchDiscogsAlbums()
      -> buildSearchParams()
      -> fetchSearchPages()
        -> discogsFetch()
    -> rankSearchResults()

app/components/ResultList.tsx
  -> /search/:Id?kind=release&credit=...&song=...&role=...&page=...

app/routes/search.$Id.tsx
  loader()
    -> fetchDiscogsRelease() or fetchDiscogsMaster()
    -> findBestTrackMatch()
    -> getTrackCredits()
      -> creditAppliesToTrack()
    -> filterCreditsByRole()
```

This split keeps the first page fast and broad, while the detail page does the
slower and more specific track/role inspection.

Recent searches are client-only state in `app/hooks/useSearchHistory.ts`.
Search criteria are loaded from and written to `localStorage` after hydration,
so the server render and first client render both start without history UI.
History entries store the URL-runnable criteria, dedupe identical searches by
moving them to the front, and keep the latest 10 entries.

## Ranking

`app/utils/searchRanking.ts` deduplicates similar releases and scores results by:

- song title match strength,
- credit token matches in searchable metadata,
- genre/style match,
- release metadata quality such as year, image, and album-like format.

This ranking is deliberately lightweight. It improves default ordering without
pretending Discogs credits are perfectly normalized.

When `sort=year_desc` or `sort=year_asc` is present, the same deduped and
scored candidate set is ordered by year instead of relevance score. Relevance
score is still used as a tie-breaker.

For sideman discovery, the ranking also lowers results where the searched
credit appears to be the primary artist in the result title. This helps surface
albums where the person is credited on someone else's release before their own
leader releases.

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
filter over the loaded release metadata, so role chips refine what is shown
without changing the upstream Discogs search request. Chips are built from the
actual roles present on the selected track, such as `Trumpet` or `Vibraphone`,
rather than from a fixed instrument list.

Credit names on the detail page link back to `/search?credit=<name>`. This lets
users pivot from a track credit to that person's other credited releases while
normal browser back navigation restores the previous detail page, including the
selected track encoded in the URL or inferred from the original song query.

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

The app runs on React Router v7 Framework Mode with the documented v8 future
flags enabled. The important framework pieces are:

- `react-router dev` and `react-router build` scripts.
- `reactRouter()` in `vite.config.ts`.
- `app/routes.ts` config routes via `@react-router/dev/routes`.
- `react-router.config.ts` for framework config and v8 future flags.
- `HydratedRouter` and `ServerRouter` in the entry files.
- Vite 6 is used because `v8_viteEnvironmentApi` requires Vite 6 or newer.
- Node 20+ is required.
- TypeScript uses bundler module resolution and generated React Router route
  types.

The enabled future flags are:

- `v8_middleware`
- `v8_splitRouteModules`
- `v8_viteEnvironmentApi`
- `v8_passThroughRequests`
- `v8_trailingSlashAwareDataRequests`

The app uses `react-router-serve` and does not have a custom `getLoadContext`
or custom Vite SSR build input, so these flags did not require route-level code
changes. Loader code that needs normalized route URLs should use the generated
`url` argument rather than assuming `request.url` is normalized.
