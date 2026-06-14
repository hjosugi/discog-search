export async function discogsFetch(
  endpoint: string,
  params: Record<string, string | number | null | undefined> = {}
) {
  const API_URL = `https://api.discogs.com/${endpoint}`
  const DISCOSG_API_KEY = process.env.DISCOGS_API_KEY
  const DISCOGS_API_SECRET = process.env.DISCOGS_API_SECRET

  const url = new URL(API_URL)

  // クエリパラメータがあれば追加
  Object.entries(params).forEach(([key, value]) => {
<<<<<<< HEAD
    if (value !== undefined && value !== null && value !== "") {
||||||| e3e4796
  Object.keys(params).forEach((key) =>
    url.searchParams.append(key, params[key])
  )
=======
    if (value !== null && value !== undefined && value !== "") {
>>>>>>> origin/codex/add-musician-information-feature
      url.searchParams.append(key, String(value))
    }
  })

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Discogs key=${DISCOSG_API_KEY}, secret=${DISCOGS_API_SECRET}`,
      "User-Agent": "discog-search/0.1",
    },
  })

  if (!response.ok) {
    throw new Error(`Discogs APIリクエストエラー: ${response.statusText}`)
  }

  return response.json()
}
