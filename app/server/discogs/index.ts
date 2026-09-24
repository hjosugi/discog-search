import { Elysia } from "elysia"

import { createDiscogsApi } from "./api"
import type { DiscogsCacheEnv } from "./cache"
import { createDiscogsClient, type DiscogsEnv } from "./client"

export type { DiscogsApi } from "./api"
export type { DiscogsCacheEnv } from "./cache"
export type { DiscogsEnv } from "./client"
export {
  DiscogsFetchError,
  DiscogsRateLimitError,
  DiscogsResponseError,
} from "./errors"

/**
 * Elysia plugin that exposes the typed Discogs API as `ctx.discogs`.
 */
export function discogsPlugin(env: DiscogsEnv & DiscogsCacheEnv = {}) {
  return new Elysia({ name: "discogs" }).decorate(
    "discogs",
    createDiscogsApi(createDiscogsClient(env))
  )
}
