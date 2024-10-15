export async function discogsFetch(endpoint: string, params: any = {}) {
  const API_URL = `https://api.discogs.com/${endpoint}`
  const DISCOSG_API_KEY = process.env.DISCOGS_API_KEY
  const DISCOGS_API_SECRET = process.env.DISCOGS_API_SECRET

  const url = new URL(API_URL)

  // クエリパラメータがあれば追加
  Object.keys(params).forEach((key) =>
    url.searchParams.append(key, params[key])
  )

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Discogs key=${DISCOSG_API_KEY}, secret=${DISCOGS_API_SECRET}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Discogs APIリクエストエラー: ${response.statusText}`)
  }

  return response.json()
}
