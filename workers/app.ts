import { createServerApp, type ServerEnv } from "../app/server/app"

const apps = new WeakMap<object, ReturnType<typeof createServerApp>>()

function getApp(env: ServerEnv) {
  const key = env as object
  let app = apps.get(key)

  if (!app) {
    app = createServerApp({ env })
    apps.set(key, app)
  }

  return app
}

export default {
  fetch(request, env) {
    return getApp(env as ServerEnv).handle(request)
  },
} satisfies ExportedHandler<Env>
