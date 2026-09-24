import type { MasterVersionsApiData } from "../server/data"
import { api, getApiErrorMessage } from "../utils/apiClient"

export type MasterVersionsLoaderData =
  | ({ ok: true } & MasterVersionsApiData)
  | { ok: false; masterId: string; errorMessage: string }

/** Data-only route used by the detail page's "Other versions" panel. */
export async function clientLoader({
  params,
  request,
}: {
  params: { masterId: string }
  request: Request
}): Promise<MasterVersionsLoaderData> {
  const page = new URL(request.url).searchParams.get("page") || "1"
  const response = await api.api
    .masters({ id: params.masterId })
    .versions.get({ query: { page } })

  if (response.error || !response.data) {
    return {
      ok: false,
      masterId: params.masterId,
      errorMessage: getApiErrorMessage(
        response.error,
        "Could not load other versions."
      ),
    }
  }

  return { ok: true, ...(response.data as unknown as MasterVersionsApiData) }
}
