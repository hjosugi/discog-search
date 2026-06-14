# React Router v7 Readiness

## Done

- Remix is on the Vite plugin path via `remix vite:dev` and `remix vite:build`.
- `engines.node` requires Node 20 or newer.
- `tsconfig.json` uses `moduleResolution: "Bundler"` and includes `vite/client`.
- Non-breaking v7 preparation flags are enabled:
  - `v3_fetcherPersist`
  - `v3_lazyRouteDiscovery`
  - `v3_relativeSplatPath`
  - `v3_singleFetch`
  - `v3_throwAbortReason`
- Touched loaders return plain data objects instead of the deprecated Remix
  `json()` helper.
- Search and detail error handling no longer turns expected Discogs failures
  into full application stack traces.

## Deferred

`v3_routeConfig` is not enabled yet. In Remix 2.17, enabling it requires an
`app/routes.ts` route config file. Turning it on without that file fails during
config resolution, so this should be done as a focused route-config migration.

The final React Router v7 Framework Mode migration should include:

- replacing Remix package imports with React Router package imports,
- migrating route config if the app chooses config routes over file routes,
- updating scripts and server entrypoints to the React Router equivalents,
- rerunning smoke tests for search, suggestions, detail pages, favicon, and
  error boundaries.

## References

- Remix future flags: https://v2.remix.run/docs/start/future-flags/
- React Router guide for upgrading from Remix: https://reactrouter.com/upgrading/remix
