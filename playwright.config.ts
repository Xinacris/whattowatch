import { defineConfig, devices } from "@playwright/test";

// Local: production builds of web + match (memory room store) behind the microfrontends proxy.
// Remote: E2E_BASE_URL=https://whattowatchxinny.vercel.app pnpm e2e
const remote = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: remote ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: remote ?? "http://localhost:3024", locale: "en-US", ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1000 } },
  webServer: remote ? undefined : [
    { command: "pnpm --filter whattowatch-web start", port: 3000, reuseExistingServer: true },
    { command: "pnpm --filter whattowatch-match start", port: 3001, reuseExistingServer: true, env: { ROOM_STORE: "memory" } },
    { command: "pnpm --dir apps/web exec microfrontends proxy microfrontends.json --local-apps whattowatch-web whattowatch-match", url: "http://localhost:3024/api/health", reuseExistingServer: true },
  ],
});
