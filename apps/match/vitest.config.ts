import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Component tests in real Chromium and WebKit (Playwright's), with the app's real Tailwind CSS.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "next/font/google": fileURLToPath(new URL("./test/stubs/next-font-google.ts", import.meta.url)),
    },
  },
  oxc: { jsx: { runtime: "automatic" } },
  define: { "process.env": JSON.stringify({ NODE_ENV: "test" }) }, // next/link and next/navigation read it
  test: {
    include: ["test/**/*.test.tsx"],
    browser: { enabled: true, headless: true, provider: playwright(), screenshotFailures: false, instances: [{ browser: "chromium" }, { browser: "webkit" }] },
  },
});
