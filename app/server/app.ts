import { Elysia, t } from "elysia"
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker"

import {
  discogsPlugin,
  type DiscogsCacheEnv,
  type DiscogsEnv,
} from "./discogs"
import {
  ApiHttpError,
  getMasterVersionsApiData,
  getReleaseApiData,
  getSearchApiData,
  getSuggestionsApiData,
} from "./data"

export type ServerEnv = DiscogsEnv & DiscogsCacheEnv & {
  ASSETS?: {
    fetch(request: Request): Promise<Response> | Response
  }
}

type ServerAppOptions = {
  env?: ServerEnv
}

const errorResponse = t.Object({
  error: t.String(),
  code: t.Optional(t.String()),
})

const paginationResponse = t.Object({
  page: t.Number(),
  totalPages: t.Number(),
  totalItems: t.Number(),
  reachedPageLimit: t.Boolean(),
})

const searchResponse = t.Object({
  results: t.Array(t.Any()),
  pagination: paginationResponse,
  errorMessage: t.Optional(t.String()),
  errorCode: t.Optional(t.String()),
})

const suggestionsResponse = t.Object({
  suggestions: t.Array(t.Any()),
})

const releaseResponse = t.Object({
  master: t.Any(),
  release: t.Any(),
  selectedTrackPosition: t.Nullable(t.String()),
  searchQuery: t.String(),
  roleFilter: t.String(),
  backQuery: t.String(),
  detailId: t.String(),
  detailKind: t.String({ pattern: "^(master|release)$" }),
})

const masterVersionsResponse = t.Object({
  masterId: t.String(),
  versions: t.Array(t.Any()),
  pagination: t.Object({
    page: t.Number(),
    totalPages: t.Number(),
    totalItems: t.Number(),
  }),
})

const searchQuery = t.Object({
  credit: t.Optional(t.String()),
  person: t.Optional(t.String()),
  song: t.Optional(t.String()),
  q: t.Optional(t.String()),
  artist: t.Optional(t.String()),
  kind: t.Optional(t.String({ pattern: "^$|^(master|release)$" })),
  track: t.Optional(t.String()),
  genre: t.Optional(t.String()),
  role: t.Optional(t.String()),
  year: t.Optional(t.String({ pattern: "^$|^\\d{4}$" })),
  decade: t.Optional(t.String({ pattern: "^$|^\\d{4}s?$" })),
  country: t.Optional(t.String()),
  format: t.Optional(t.String()),
  sort: t.Optional(
    t.String({ pattern: "^$|^(relevance|year_desc|year_asc)$" })
  ),
  page: t.Optional(t.String({ pattern: "^$|^[1-9][0-9]*$" })),
})

const suggestionsQuery = t.Object({
  song: t.Optional(t.String()),
  q: t.Optional(t.String()),
  credit: t.Optional(t.String()),
  person: t.Optional(t.String()),
  genre: t.Optional(t.String()),
})

const releaseQuery = t.Object({
  kind: t.Optional(t.String({ pattern: "^$|^(master|release)$" })),
  track: t.Optional(t.String()),
  song: t.Optional(t.String()),
  q: t.Optional(t.String()),
  role: t.Optional(t.String()),
  credit: t.Optional(t.String()),
  genre: t.Optional(t.String()),
  year: t.Optional(t.String()),
  decade: t.Optional(t.String()),
  country: t.Optional(t.String()),
  format: t.Optional(t.String()),
  sort: t.Optional(t.String()),
  page: t.Optional(t.String()),
})

export function createServerApp({ env = {} }: ServerAppOptions = {}) {
  return new Elysia({
    aot: false,
    adapter: CloudflareAdapter,
    normalize: "typebox",
  })
    .use(discogsPlugin(env))
    .onError(({ code, error, status }) => {
      if (error instanceof ApiHttpError) {
        return status(error.status, { error: error.message, code: error.code })
      }
      if (code === "VALIDATION") {
        return status(422, {
          error: "Invalid request parameters.",
          code: "bad_request",
        })
      }

      console.error("Unhandled API error:", error)
      return status(500, { error: "Internal server error.", code: "internal" })
    })
    .get(
      "/api/search",
      ({ query, discogs }) =>
        getSearchApiData(toSearchParams(query), discogs),
      {
        query: searchQuery,
        response: {
          200: searchResponse,
          422: errorResponse,
          500: errorResponse,
        },
      }
    )
    .get(
      "/api/suggestions",
      ({ query, discogs }) =>
        getSuggestionsApiData(toSearchParams(query), discogs),
      {
        query: suggestionsQuery,
        response: {
          200: suggestionsResponse,
          422: errorResponse,
          500: errorResponse,
        },
      }
    )
    .get(
      "/api/releases/:id",
      ({ params, query, discogs }) =>
        getReleaseApiData({
          id: params.id,
          searchParams: toSearchParams(query),
          discogs,
        }),
      {
        params: t.Object({
          id: t.String({ pattern: "^[0-9]+$" }),
        }),
        query: releaseQuery,
        response: {
          200: releaseResponse,
          400: errorResponse,
          404: errorResponse,
          422: errorResponse,
          429: errorResponse,
          500: errorResponse,
          502: errorResponse,
        },
      }
    )
    .get(
      "/api/masters/:id/versions",
      ({ params, query, discogs }) =>
        getMasterVersionsApiData({
          id: params.id,
          page: query.page ? Number(query.page) : 1,
          discogs,
        }),
      {
        params: t.Object({
          id: t.String({ pattern: "^[0-9]+$" }),
        }),
        query: t.Object({
          page: t.Optional(t.String({ pattern: "^$|^[1-9][0-9]{0,3}$" })),
        }),
        response: {
          200: masterVersionsResponse,
          404: errorResponse,
          422: errorResponse,
          429: errorResponse,
          500: errorResponse,
          502: errorResponse,
        },
      }
    )
    .all("*", ({ request }) =>
      env.ASSETS?.fetch(request) ??
      new Response("Not found", {
        status: 404,
      })
    )
}

export const app = createServerApp()

export type App = typeof app

function toSearchParams(query: Record<string, unknown>) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      searchParams.set(key, value)
    }
  }

  return searchParams
}
