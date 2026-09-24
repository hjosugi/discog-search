import type { SearchParam } from "../../types"
import type { DiscogsClient } from "./client"
import {
  DiscogsMasterSchema,
  DiscogsReleaseSchema,
  DiscogsSearchResponseSchema,
  parseDiscogsResponse,
  type DiscogsMaster,
  type DiscogsRelease,
  type DiscogsSearchResponse,
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
  }
}
