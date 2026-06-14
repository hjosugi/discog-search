import { createRequestHandler } from "react-router"

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
)

// Secrets/vars are read via process.env (populated by the nodejs_compat
// runtime from the Worker's bindings), so no load context needs threading.
export default {
  fetch(request) {
    return requestHandler(request)
  },
} satisfies ExportedHandler<Env>
