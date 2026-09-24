import type { SearchParam } from "../../types"
import type { DiscogsClient } from "./client"
import {
  DiscogsMasterSchema,
  DiscogsReleaseSchema,
  DiscogsSearchResponseSchema,
  MasterVersionsResponseSchema,
  parseDiscogsResponse,
  type DiscogsMaster,
  type DiscogsRelease,
  type DiscogsSearchResponse,
  type MasterVersionsResponse,
} from "./schemas"

/**
 * Typed Discogs endpoints. Every function validates the payload against its
 * schema, so callers receive either a well-formed value or a thrown
 * `DiscogsFetchError` subclass (`DiscogsRateLimitError`, `DiscogsResponseError`).
 */
export type DiscogsApi = {
  search(params: SearchParam): Promise<DiscogsSearchResponse>
  getMaster(id: string | number): Promise<DiscogsMaster>
  getRelease(id: string | number): Promise<DiscogsRelease>
  getMasterVersions(
    id: string | number,
    options: { page: number; perPage: number }
  ): Promise<MasterVersionsResponse>
}

export function createDiscogsApi(client: DiscogsClient): DiscogsApi {
  return {
    async search(params) {
      const endpoint = "database/search"
      return parseDiscogsResponse(
        DiscogsSearchResponseSchema,
        await client.request(endpoint, params),
        endpoint
      )
    },
    async getMaster(id) {
      const endpoint = `masters/${id}`
      return parseDiscogsResponse(
        DiscogsMasterSchema,
        await client.request(endpoint),
        endpoint
      )
    },
    async getRelease(id) {
      const endpoint = `releases/${id}`
      return parseDiscogsResponse(
        DiscogsReleaseSchema,
        await client.request(endpoint),
        endpoint
      )
    },
    async getMasterVersions(id, { page, perPage }) {
      const endpoint = `masters/${id}/versions`
      return parseDiscogsResponse(
        MasterVersionsResponseSchema,
        await client.request(endpoint, {
          page,
          per_page: perPage,
          sort: "released",
          sort_order: "asc",
        }),
        endpoint
      )
    },
  }
}
