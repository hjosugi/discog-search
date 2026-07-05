import { spawn } from "node:child_process"
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const devVarsPath = path.join(rootDir, ".dev.vars")
const appPort = getArgValue("--app-port") || "3000"
const apiPort = getArgValue("--api-port") || "39201"
const hadDevVars = existsSync(devVarsPath)
const originalDevVars = hadDevVars
  ? stripE2eBlock(readFileSync(devVarsPath, "utf8")).trim()
  : ""
const hadUserDevVars = originalDevVars.length > 0
let restored = false

writeFileSync(
  devVarsPath,
  [
    originalDevVars.trim(),
    "# BEGIN Playwright E2E Discogs mock",
    `DISCOGS_API_BASE_URL=http://127.0.0.1:${apiPort}`,
    "DISCOGS_TOKEN=playwright-test-token",
    "# END Playwright E2E Discogs mock",
  ]
    .filter(Boolean)
    .join("\n") + "\n"
)

const child = spawn("pnpm", ["dev", "--host", "127.0.0.1", "--port", appPort], {
  cwd: rootDir,
  env: {
    ...process.env,
    DISCOGS_API_BASE_URL: `http://127.0.0.1:${apiPort}`,
    DISCOGS_TOKEN: "playwright-test-token",
  },
  stdio: "inherit",
})

child.on("exit", (code, signal) => {
  restoreDevVars()
  process.exit(code ?? (signal ? 1 : 0))
})

process.on("SIGINT", () => stopChild("SIGINT"))
process.on("SIGTERM", () => stopChild("SIGTERM"))
process.on("exit", restoreDevVars)

function stopChild(signal) {
  child.kill(signal)
}

function restoreDevVars() {
  if (restored) return
  restored = true

  if (hadUserDevVars) {
    writeFileSync(devVarsPath, `${originalDevVars}\n`)
  } else {
    rmSync(devVarsPath, { force: true })
  }
}

function stripE2eBlock(value) {
  return value.replace(
    /# BEGIN Playwright E2E Discogs mock[\s\S]*?# END Playwright E2E Discogs mock\n?/g,
    ""
  )
}

function getArgValue(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}
