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
- All documented React Router v8 future flags for Framework Mode are enabled:
  middleware, split route modules, Vite Environment API, pass-through requests,
  and trailing-slash-aware data requests.

## Deferred

- Upgrading the package major to React Router v8 should wait until v8 is
  released and the app can also satisfy its dependency floor.
- Browser smoke testing against a running local server is still useful for
  search, suggestions, detail pages, favicon, and error boundaries.

## References

- React Router guide for upgrading from Remix: https://reactrouter.com/upgrading/remix
- React Router future flags: https://reactrouter.com/upgrading/future
