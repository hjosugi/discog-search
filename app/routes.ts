import {
  index,
  route,
  type RouteConfig,
} from "@react-router/dev/routes"

export default [
  index("routes/_index.tsx"),
  route("search", "routes/search._index.tsx"),
  route("search/suggestions", "routes/search.suggestions.tsx"),
  route("search/:Id", "routes/search.$Id.tsx"),
] satisfies RouteConfig
