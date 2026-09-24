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
  clientLoader()
    -> Eden Treaty client
    -> GET /api/search
      -> app/server/app.ts
      -> app/server/data.ts
        -> searchDiscogsAlbums()
          -> buildSearchParams()
          -> fetchSearchPages()
            -> ctx.discogs.search()
        -> rankSearchResults()

app/components/ResultList.tsx
  -> /search/:Id?kind=release&credit=...&song=...&role=...&page=...

app/routes/search.$Id.tsx
  clientLoader()
    -> Eden Treaty client
    -> GET /api/releases/:id
      -> ctx.discogs.getRelease() / ctx.discogs.getMaster()
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

Favorites are also client-only. `app/utils/favorites.ts` holds the pure list
logic (add/remove/toggle, dedupe by `kind:id`, a 200-entry cap, defensive
parsing, and the link back to the detail page). `app/hooks/useFavorites.ts`
wraps it in a small external store shared through `useSyncExternalStore`, so
the result-card stars, the detail-page star, the header count, and the
`/favorites` page stay in sync, including across browser tabs. Persistence is
behind the `FavoritesStorage` interface; the shipped implementation uses
`localStorage` (`discog-search:favorites`), and an account-synced store only
needs to implement `read`, `write`, and `subscribe`. Each favorite remembers
the `credit` and `song` it was saved from and reopens the detail page with
them.

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

Album detail pages live in `app/routes/search.$Id.tsx`. The route module only
loads data and composes the page; the pieces live elsewhere:

- `app/components/album/`: `AlbumHeader`, `CreditList`, `RoleFilterLinks`,
  `TrackList`, `VideoList`, `SectionTitle`, `Panel`, `DetailBreadcrumb`, and
  `AlbumErrorState`.
- `app/utils/trackCredits.ts`: credit domain logic (`getTrackCredits`,
  `creditAppliesToTrack`, `dedupeCredits`, `isPerformanceRole`, role filters).
- `app/utils/albumDetail.ts`: detail-page links (`buildDetailHref` keeps the
  search context and `kind=release`), cover/artist helpers, video matching,
  selected-track resolution, and page meta.
- `app/utils/streaming.ts`: Apple Music / Spotify / YouTube Music links.
- `app/utils/text.ts`: the only text normalization helpers. `normalizeText`
  (drops "(Take 3)"/"[Live]" notes) is used for matching titles, names, and
  roles; `normalizeForRanking` keeps those notes for search scoring; both fold
  case, accents, and full-width characters and keep non-Latin scripts.

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

When the album belongs to a Discogs master (a master page, or a release with a
`master_id`), an "Other versions" panel loads `masters/{id}/versions` through
`GET /api/masters/:id/versions` (100 per page, sorted by release date, with a
"Load more" button and a local country/year/format/label filter). Reissues can
carry different credits, so each row links to
`/search/{releaseId}?kind=release` with the same search context; the selected
track is dropped because track positions differ between pressings. The row for
the release currently shown is marked with `aria-current` and a "Current"
badge. The panel loads through the data-only client route
`routes/masters.versions.tsx`, so it never blocks the main detail request.

When the detail page is opened from a credit search (`credit=<name>` in the
URL), a panel at the top answers the reverse question "on which tracks of this
album does this person appear, and as what?". `getPersonAlbumCredits()` in
`app/utils/trackCredits.ts` runs `getTrackCredits()` for every playable track
(so `tracks` ranges such as "A1 to B2" are expanded by
`creditAppliesToTrack()`), keeps the credits whose name or name variation
(`anv`) matches the searched person after normalization (Discogs
disambiguation suffixes like "(2)" are ignored), and lists album-wide
non-performance roles such as Producer separately. Each row links to the same
page with `track=<position>`, and the searched person's cards in the credit
lists below are highlighted. If the person is not credited on this release,
the panel says so and points to other versions.

The Videos section shows up to three Discogs videos, preferring the ones whose
title mentions the selected track. YouTube URLs (`watch?v=`, `youtu.be/`,
`/embed/`, `/shorts/`, ...) are parsed by `app/utils/video.ts` and rendered as
a lite embed: a lazily loaded `i.ytimg.com` thumbnail in a reserved 16:9 box
with a play button. The `youtube-nocookie.com` iframe is only created after the
user presses play, so the initial page load requests no player code and the
swap causes no layout shift. Other video URLs stay external links.

Credit names on the detail page link back to `/search?credit=<name>`. This lets
users pivot from a track credit to that person's other credited releases while
normal browser back navigation restores the previous detail page, including the
selected track encoded in the URL or inferred from the original song query.

## Server API and Discogs Fetch Layer

The Cloudflare Worker entrypoint in `workers/app.ts` creates the Elysia app from
`app/server/app.ts`. React Router route modules are SPA client routes; they do
not read Discogs secrets or call Discogs directly. Their `clientLoader`
functions call the same-origin Elysia API through Eden Treaty.

The Elysia app exposes:

- `GET /api/search`
- `GET /api/suggestions`
- `GET /api/releases/:id`
- `GET /api/masters/:id/versions`

The Discogs layer lives in `app/server/discogs/`:

- `client.ts` is the low-level HTTP client. It adds `DISCOGS_TOKEN` auth (with
  key/secret fallback), builds query strings, caches responses for 10 minutes,
  coalesces duplicate in-flight requests, applies a cooldown after HTTP 429
  responses, and reads at most 2 KB of Discogs error bodies.
- `cache.ts` holds the cache backends behind one `DiscogsCacheStore`
  interface (response get/put plus the shared `rateLimitedUntil`).
  `createDiscogsCache(env)` layers the per-isolate memory store over a shared
  store: Workers KV when a `DISCOGS_CACHE` binding exists, otherwise the Cache
  API (`caches.default`, shared per data center, no binding needed), otherwise
  memory only (Vitest, plain Vite dev). KV keys are SHA-256 hashes of the
  Discogs URL; KV TTLs are clamped to KV's 60 second minimum while the stored
  expiry keeps the real 10 minute / cooldown deadlines. A failing shared store
  is logged and treated as a miss. Cached responses are served even during a
  429 cooldown; only uncached requests fail fast with `DiscogsRateLimitError`.
- `api.ts` exposes typed endpoint functions (`search`, `getMaster`,
  `getRelease`). Each validates the JSON payload against a TypeBox schema from
  `schemas.ts`; `app/types.ts` re-exports the types derived from those schemas.
- `errors.ts` defines `DiscogsFetchError` (any failed request),
  `DiscogsRateLimitError` (HTTP 429 or an active cooldown), and
  `DiscogsResponseError` (payload failed schema validation, surfaced as 502).
- `index.ts` is the Elysia plugin that decorates the typed API as
  `ctx.discogs`.

Rate limiting is an error, not a special response shape: the client throws
`DiscogsRateLimitError`, and `toApiError()` in `app/server/data.ts` is the one
place that maps Discogs errors to an HTTP status, a stable error `code`
(`discogs_auth`, `discogs_rate_limited`, `discogs_not_found`,
`discogs_bad_response`, `discogs_error`, `bad_request`, `internal`), and the
user-facing message. Search keeps already loaded result pages when only a later
page is rate limited and reports the rate limit alongside them.

This keeps API failures from becoming application crashes and reduces repeat
calls during typing and navigation.

## Internationalization

The UI ships in English and Japanese. Dictionaries live in
`app/i18n/messages.ts`; `en` defines the keys and `ja` must provide all of them
with the same `{placeholders}` (a unit test enforces both). `app/i18n/locale.ts`
has the pure helpers (`translate`, `negotiateLocale`, cookie parsing, number
and date formatting), and `app/i18n/I18nProvider.tsx` exposes `useI18n()`
(`t`, `locale`, `setLocale`, `formatNumber`, `formatDate`).

Locale resolution:

1. An explicit choice from the header language selector is stored in the
   `lang` cookie (one year).
2. Otherwise the Worker negotiates `Accept-Language`. Because the app is an SPA
   whose `index.html` is prerendered, the Worker rewrites the HTML shell's
   `<html lang>` and `data-locale` for every HTML response
   (`app/server/html.ts`, with `Vary: Cookie, Accept-Language`).
3. Without the Worker (plain Vite dev) the client falls back to
   `navigator.languages`.

The locale is kept in a small external store so the prerendered English shell
hydrates without a mismatch and switches right after hydration; `<html lang>`
follows the selected locale. Route `meta()` functions use `getActiveLocale()`.

API errors carry a stable `code` (see `toApiError()`), and the UI shows the
localized text for that code via `translateApiError()`, falling back to the
English server message for unknown codes. Discogs data (titles, names, roles,
formats) is shown as Discogs returns it.

## Styling

Chakra UI v2 is the only styling system. The theme lives in `app/theme.ts` and
is passed to `ChakraProvider` in `app/root.tsx`; there is no Tailwind, PostCSS,
or global stylesheet.

Components use semantic color tokens instead of raw palette values:

- `bg.canvas`, `bg.surface`, `bg.subtle`, `bg.muted`, `bg.accent`, and
  `bg.selected` for page, card, and state backgrounds;
- `border.default`, `border.selected`, and `border.hover` for borders;
- `text.default`, `text.secondary`, `text.muted`, `text.subtle`, `text.icon`,
  `text.accent`, `text.link`, and `text.linkHover` for text and icons;
- `logo.bg` and `logo.fg` for the header mark.

New UI should reuse these tokens (or add a new semantic token in
`app/theme.ts`) rather than hard-coding `white` / `gray.*` / `blue.*` values.
Every token has a `_dark` value, which is what makes dark mode work.

### Dark mode

The header's color theme menu offers Light, Dark, and System. The preference
is stored in `localStorage` (`discog-search:color-mode`) by `app/colorMode.ts`;
"System" removes the key and follows `prefers-color-scheme`, including changes
while the page is open. Chakra's default storage manager would persist the
first system-derived mode as if the user had chosen it, so the app passes a
custom `colorModeManager` that only reports the resolved mode and ignores
Chakra's writes. An inline script in `<head>` (`colorModeScript`) sets
`<html data-theme>` and `color-scheme` from the same preference before first
paint, so there is no light flash for dark-mode users. The root `ErrorBoundary`
renders inside the same app shell, so 404 and unexpected-error pages are
themed too.

## React Router v7

The app runs on React Router v7 Framework Mode in SPA mode with a custom Elysia
Worker API. The important framework pieces are:

- `react-router build` for SPA assets.
- `wrangler dev --config wrangler.jsonc` for the full local Worker/API server.
- `reactRouter()` in `vite.config.ts`.
- `app/routes.ts` config routes via `@react-router/dev/routes`.
- `react-router.config.ts` for framework config and v8 future flags.
- `HydratedRouter` for the client entry and a small Web Streams
  `entry.server.tsx` used by React Router to prerender the SPA fallback.
- Vite 6 is used because `v8_viteEnvironmentApi` requires Vite 6 or newer.
- Node 20+ is required.
- TypeScript uses bundler module resolution and generated React Router route
  types.

The enabled future flags are:

- `v8_middleware`
- `v8_splitRouteModules`
- `v8_viteEnvironmentApi`
- `v8_trailingSlashAwareDataRequests`

The app no longer uses `react-router-serve` or React Router SSR for runtime
requests. Cloudflare static assets are bound as `env.ASSETS` with
`not_found_handling = "single-page-application"`, and non-API requests fall
through to that asset binding.
