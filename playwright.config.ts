import { defineConfig, devices } from "@playwright/test"

const appPort = 3000
const mockApiPort = 39201

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${appPort}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `node tests/e2e/fixtures/discogs-api.mjs --port ${mockApiPort}`,
      url: `http://127.0.0.1:${mockApiPort}/health`,
      reuseExistingServer: !process.env.CI,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
    {
      command: `node tests/e2e/run-dev-server.mjs --app-port ${appPort} --api-port ${mockApiPort}`,
      url: `http://127.0.0.1:${appPort}/search`,
      reuseExistingServer: !process.env.CI,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
  ],
})
