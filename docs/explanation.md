# Discogs Credits Finder 解説書

## 目的

このアプリの中心目的は、次のような探し方をできるようにすることです。

- Tony Williams が sideman / performer / credit として参加している album を探す
- 参加者名と曲名を組み合わせて release を探す
- 見つけた release の track ごとの performer / credit を確認する
- drums / bass などの role で detail 表示を絞り込む

## 用語

このアプリでは、UI と URL の主キーを `credit` に寄せています。

Discogs API には「personnel 専用検索」のような明確な endpoint はありません。なので、このアプリでは Discogs の database search に渡せる `credit` フィルタを使って、personnel 的な検索を実現しています。

古いリンクとの互換性のために `person` パラメータも読みますが、今後の基本形は次です。

```text
/search?credit=Tony%20Williams
/search?credit=Tony%20Williams&song=Night%20In%20Tunisia
/search?credit=Tony%20Williams&song=Night%20In%20Tunisia&genre=Jazz
/search?credit=Tony%20Williams&song=Night%20In%20Tunisia&role=drums
```

## 検索の仕組み

検索処理の中心は `app/utils/discogsSearch.ts` です。

Discogs への主な request は次の形です。

```text
database/search?credit=Tony Williams&type=release&per_page=100&page=1
database/search?credit=Tony Williams&track=Night In Tunisia&type=release&per_page=100&page=1
```

ポイントは `type=release` です。master は作品単位のまとまりとして便利ですが、tracklist や performer credit を詳しく見るには release の方が向いています。sideman 探しでは release data が重要なので、`credit` または `song` があるときは release 検索にしています。

曲名検索ではまず `track=<song>` を使います。Discogs の track metadata は揺れることがあるので、結果が 0 件だった場合だけ `q=<song>` に fallback します。

## Ranking

Discogs の `credit` は完全に正規化された sideman 判定ではありません。ある人が release のどこかに credit されている、という広い意味の一致です。

そのため `app/utils/searchRanking.ts` で軽い ranking を入れています。

- 曲名に強く一致する release を上げる
- genre/style が一致する release を上げる
- 画像や年がある release を少し上げる
- album / LP / CD っぽい format を少し上げる
- `Various Artists` を少し下げる
- credit 名が title の主名義っぽい場合は少し下げる

最後の調整は sideman 探し向けです。たとえば Tony Williams 名義の album より、Tony Williams が credit として参加している別名義の album を上に出しやすくします。

## Detail Page

詳細画面は `app/routes/search.$Id.tsx` です。

検索結果が release の場合、URL に `kind=release` を付けます。

```text
/search/123456?kind=release&credit=Tony%20Williams
```

詳細 API は次の順で data を解決します。

- `kind=release` なら `releases/{id}` を取得する
- release に `master_id` があれば `masters/{master_id}` も取得する
- master から来た場合は `main_release` を取得できれば取得する
- URL の `track` または検索時の `song` から selected track を決める
- selected track の `extraartists` と release-level `extraartists` をまとめる

release-level credit に `tracks` 範囲がある場合は、その範囲が selected track に当たるか確認してから表示します。

`role` は Discogs search request には送りません。Discogs の public search API では instrument role を安定して絞り込むことが難しいためです。代わりに detail page で release data を取得してから、`extraartists.role` に対する local filter として使います。

## Rate Limit と Cache

Discogs API 呼び出しは `app/server/discogs/` に集約しています。

- `client.ts`: `DISCOGS_TOKEN` (または `DISCOGS_API_KEY` / `DISCOGS_API_SECRET`) による auth、query parameter の組み立て、10 分の response cache、同じ URL への同時 request の coalescing、HTTP 429 のあとの cooldown、error body の読み取り上限
- `cache.ts`: cache の保存先。isolate 内の memory の上に共有ストアを重ねる。`DISCOGS_CACHE` KV binding があれば Workers KV (全リージョン共有)、なければ Cache API (`caches.default`、データセンター単位で共有、binding 不要)、どちらもない環境 (Vitest など) は memory のみ。429 の cooldown (`rateLimitedUntil`) も同じストアで isolate をまたいで共有する
- `api.ts`: `search` / `getMaster` / `getRelease` の型付き関数。Discogs の JSON は `schemas.ts` の TypeBox schema で検証してから返す (`app/types.ts` の型も schema から導出)
- `errors.ts`: `DiscogsFetchError` / `DiscogsRateLimitError` (429 と cooldown 中) / `DiscogsResponseError` (schema 不一致、502 扱い)
- `index.ts`: typed API を `ctx.discogs` として渡す Elysia plugin

rate limit は `{ results: [], rateLimited: true }` のような特殊な戻り値ではなく `DiscogsRateLimitError` として throw します。HTTP status・error code・表示用 message への変換は `app/server/data.ts` の `toApiError()` 1 か所で行います。

これにより、入力中の suggestions や同じ検索の再実行で Discogs を叩きすぎないようにしています。

## Suggestions

候補検索の UI route は `app/routes/search.suggestions.tsx` です。

React Router SPA の `clientLoader` から Eden Treaty で `/api/suggestions`
を呼び、Elysia 側で Discogs search を実行します。

```ts
return { suggestions }
```

## React Router v7 Framework Mode

この app は React Router v7 Framework Mode の SPA mode と Elysia API に移行済みです。

済んでいること:

- `react-router build` で SPA assets を生成
- `wrangler dev --config wrangler.jsonc` で Worker / Elysia / static assets を起動
- `reactRouter()` Vite plugin を使用
- `app/routes.ts` で config routes を定義
- entry file は `HydratedRouter` と SPA fallback 用の小さい `entry.server.tsx` を使用
- `@remix-run/*` import は React Router package へ移行
- Vite 6 を使用
- React Router v8 future flags を有効化
- deprecated `json()` helper の削除
- route loader の Discogs access を Elysia API + Eden Treaty に移動

## ローカル調査メモ

`.work/` は gitignore 済みの作業ディレクトリです。

今は `.work/discogs-credit-search-notes.md` に、Discogs credit 検索の実装メモを置いています。ここは実験や調査用で、永続的な設計説明は `docs/` に書きます。
