# React Router v7 Migration

## Done

- The app now runs on React Router v7 Framework Mode.
- Runtime serving now uses `wrangler dev --config wrangler.jsonc` against
  React Router SPA assets.
- The Vite plugin is `reactRouter()` from `@react-router/dev/vite`.
- Vite is upgraded to 6.x so `future.v8_viteEnvironmentApi` can run in both
  build and dev.
- `engines.node` requires Node 20 or newer.
- `tsconfig.json` uses `moduleResolution: "Bundler"`, includes
  `.react-router/types/**/*`, and runs `react-router typegen` before `tsc`.
- `app/routes.ts` defines the current routes with the v7-style config route
  shape via `@react-router/dev/routes`.
- Entry files use `HydratedRouter` and a small Web Streams server entry for SPA
  fallback prerendering.
- Route/component imports now come from `react-router` instead of
  `@remix-run/*`.
- React Router routes use `clientLoader` and call the Elysia API through Eden
  Treaty.
- Search and detail error handling no longer turns expected Discogs failures
  into full application stack traces.
- Runtime React Router SSR dependencies (`@react-router/node`,
  `@react-router/serve`, and `isbot`) have been removed.
- The enabled React Router v8 future flags are middleware, split route modules,
  Vite Environment API, and trailing-slash-aware data requests.

## Deferred

- Upgrading the package major to React Router v8 should wait until v8 is
  released and the app can also satisfy its dependency floor.
- Browser smoke testing against a running local server is still useful for
  search, suggestions, detail pages, favicon, and error boundaries.

## References

- React Router guide for upgrading from Remix: https://reactrouter.com/upgrading/remix
- React Router future flags: https://reactrouter.com/upgrading/future
