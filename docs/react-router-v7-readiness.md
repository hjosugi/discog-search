# React Router v7 Migration

## Done

- The app now runs on React Router v7 Framework Mode.
- Scripts use `react-router dev`, `react-router build`, and
  `react-router-serve`.
- The Vite plugin is `reactRouter()` from `@react-router/dev/vite`.
- `engines.node` requires Node 20 or newer.
- `tsconfig.json` uses `moduleResolution: "Bundler"`, includes
  `.react-router/types/**/*`, and runs `react-router typegen` before `tsc`.
- `app/routes.ts` defines the current routes with the v7-style config route
  shape via `@react-router/dev/routes`.
- Entry files use `HydratedRouter` and `ServerRouter`.
- Route/component imports now come from `react-router` instead of
  `@remix-run/*`.
- Loaders return plain data objects instead of the deprecated Remix `json()`
  helper.
- Search and detail error handling no longer turns expected Discogs failures
  into full application stack traces.

## Deferred

- The build currently emits React Router v8 future flag warnings. Those should
  be evaluated separately because they opt into behavior for the next major.
- Browser smoke testing against a running local server is still useful for
  search, suggestions, detail pages, favicon, and error boundaries.

## References

- Remix future flags: https://v2.remix.run/docs/start/future-flags/
- React Router guide for upgrading from Remix: https://reactrouter.com/upgrading/remix
