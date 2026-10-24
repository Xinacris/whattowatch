import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { protectionHeaders } from "./e2e/protection";

// Local: production builds of web + match (memory room store) behind the microfrontends proxy.
// Remote: E2E_BASE_URL=https://whattowatchxinny.vercel.app pnpm e2e
// Protected preview: also set VERCEL_AUTOMATION_BYPASS_SECRET (the web project's "Protection Bypass for Automation").
const remote = process.env.E2E_BASE_URL;
// Linux with the NVIDIA driver: WebKit's GPU compositor segfaults inside libnvidia-eglcore at random.
// Mesa's EGL and Skia's CPU renderer keep it stable; elsewhere this is a no-op.
const MESA_EGL = "/usr/share/glvnd/egl_vendor.d/50_mesa.json";
const webkitEnv = existsSync(MESA_EGL) ? { launchOptions: { env: { ...process.env, __EGL_VENDOR_LIBRARY_FILENAMES: MESA_EGL, WEBKIT_SKIA_ENABLE_CPU_RENDERING: "1" } } } : {};

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: remote ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: remote ?? "http://localhost:3024", locale: "en-US",
    extraHTTPHeaders: protectionHeaders },
  // The whole suite on each. A test that can't apply to one says so with test.skip(condition, reason).
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1000 } } },
    { name: "mobile-chromium", use: { ...devices["iPhone 14"], browserName: "chromium" } },
    { name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 1000 }, ...webkitEnv } },
  ],
  webServer: remote ? undefined : [
    { command: "pnpm --filter whattowatch-web start", port: 3000, reuseExistingServer: true },
    { command: "pnpm --filter whattowatch-match start", port: 3001, reuseExistingServer: true, env: { ROOM_STORE: "memory" } },
    { command: "pnpm --dir apps/web exec microfrontends proxy microfrontends.json --local-apps whattowatch-web whattowatch-match", url: "http://localhost:3024/api/health", reuseExistingServer: true },
  ],
});
