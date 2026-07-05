# Sideman Album Finder

Sideman Album Finder is a React Router v7 app for searching Discogs releases by performer credit, song title, genre, and local role filters. It is designed for questions like "which albums include Tony Williams as a sideman?" and then lets you inspect release and track-level credits on the detail page.

The app runs on Cloudflare Workers through the Cloudflare Vite plugin. Search uses the Discogs database search API for broad candidate discovery, then release detail pages verify the tracklist and `extraartists` credits.

## Stack

- React 18 and React Router v7 Framework Mode
- Chakra UI with a small amount of Tailwind CSS
- Cloudflare Workers and `wrangler`
- pnpm 9, Node.js 20+
- Vitest for unit tests

## Setup

Install dependencies:

```sh
pnpm install
```

Create local environment files from the example:

```sh
cp .env.example .env
cp .env.example .dev.vars
```

Set at least one Discogs authentication style:

```sh
DISCOGS_TOKEN=your-discogs-token
```

or:

```sh
DISCOGS_API_KEY=your-discogs-key
DISCOGS_API_SECRET=your-discogs-secret
```

`DISCOGS_TOKEN` is the preferred path and is also the secret expected by the deploy workflow.

## Development

Start the local dev server:

```sh
pnpm dev
```

Run the checks used by CI:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Generate Cloudflare Worker binding types when `wrangler.jsonc` changes:

```sh
pnpm cf-typegen
```

Preview a production build locally:

```sh
pnpm preview
```

## Deployment

Deploy manually from a configured local environment:

```sh
pnpm deploy
```

GitHub Actions runs `lint`, `typecheck`, `test`, and `build` on pull requests and pushes to `main`. The deploy workflow runs after the `CI` workflow succeeds on `main`, then deploys with `cloudflare/wrangler-action` when these repository secrets are configured:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `DISCOGS_TOKEN`

## Discogs API Notes

Discogs search is rate-limited. The app wraps Discogs calls in `app/utils/discogsAuthMiddleware.ts`, which adds authentication, caches responses for 10 minutes, coalesces duplicate in-flight requests, and applies a short cooldown after HTTP 429 responses.

The app uses Discogs database search filters such as `credit`, `track`, `genre`, and `type=release`. Role filters like `drums` or `bass` are local detail-page filters over loaded `extraartists.role` values because Discogs public search does not expose a stable instrument-role filter.

When deploying or presenting results, keep Discogs attribution visible in the product UI and link users back to the source release when possible.

## Documentation

- [Architecture](docs/architecture.md): search flow, request model, ranking, detail flow, and React Router v7 notes.
- [Explanation](docs/explanation.md): Japanese project notes covering terminology, search behavior, ranking, detail pages, and caching.
- [React Router v7 readiness](docs/react-router-v7-readiness.md): migration and compatibility notes.
