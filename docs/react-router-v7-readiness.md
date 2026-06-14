# React Router v7 Readiness

## Done

- Remix is on the Vite plugin path via `remix vite:dev` and `remix vite:build`.
- `engines.node` requires Node 20 or newer.
- `tsconfig.json` uses `moduleResolution: "Bundler"` and includes `vite/client`.
- Non-breaking v7 preparation flags are enabled:
  - `v3_fetcherPersist`
  - `v3_lazyRouteDiscovery`
  - `v3_relativeSplatPath`
  - `v3_routeConfig`
  - `v3_singleFetch`
  - `v3_throwAbortReason`
- `app/routes.ts` defines the current routes with the v7-style config route
  shape via `@remix-run/route-config`.
- Touched loaders return plain data objects instead of the deprecated Remix
  `json()` helper.
- Search and detail error handling no longer turns expected Discogs failures
  into full application stack traces.

## Deferred

The final React Router v7 Framework Mode migration should include:

- replacing Remix package imports with React Router package imports,
- updating scripts and server entrypoints to the React Router equivalents,
- replacing `@remix-run/route-config` imports in `app/routes.ts` with
  `@react-router/dev/routes`,
- adding `react-router.config.ts` if deployment/runtime config needs to move
  out of Remix conventions,
- rerunning smoke tests for search, suggestions, detail pages, favicon, and
  error boundaries.

## References

- Remix future flags: https://v2.remix.run/docs/start/future-flags/
- React Router guide for upgrading from Remix: https://reactrouter.com/upgrading/remix
