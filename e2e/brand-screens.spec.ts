import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Not part of the normal run: SCREENS=1 pnpm e2e e2e/brand-screens.spec.ts --project=desktop-chromium
test.skip(!process.env.SCREENS, "screenshots only on request");

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3024";
const OUT = ".screens";

for (const width of [375, 1280]) {
  test(`header at ${width}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 700 }, deviceScaleFactor: 2 });
    await ctx.addCookies([{ name: "wtw_lang", value: "en", url: BASE }]);
    const p = await ctx.newPage();
    await p.goto("/");
    await expect(p.getByTestId("logo")).toBeVisible();
    await p.evaluate(() => document.fonts.ready);
    await p.locator("header").screenshot({ path: `${OUT}/v26-header-${width}.png` });
  });
}

// Headless browsers have no tab strip, so draw one: the real icons, at 1:1, next to a real tab title.
test("tab strip with the favicon", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 760, height: 150 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const tab = (bg: string, active: string, ink: string, icon: string, size: number) =>
    `<div style="display:flex;gap:2px;background:${bg};padding:8px 8px 0">
      <div style="display:flex;align-items:center;gap:8px;background:${active};color:${ink};padding:8px 12px;border-radius:8px 8px 0 0;width:220px;font:12px system-ui">
        <img src="${BASE}${icon}" width="${size}" height="${size}"><span>Movie night · WhatToWatch</span></div>
      <div style="display:flex;align-items:center;gap:8px;color:${ink};opacity:.7;padding:8px 12px;width:180px;font:12px system-ui">Another tab</div></div>`;
  await p.setContent(`<body style="margin:0">${tab("#1f1f1f", "#3c3c3c", "#e8e8e8", "/favicon.ico", 16)}${tab("#dfe1e5", "#ffffff", "#202124", "/favicon.ico", 16)}${tab("#1f1f1f", "#3c3c3c", "#e8e8e8", "/icon.svg", 16)}</body>`);
  await p.waitForLoadState("networkidle");
  await p.screenshot({ path: `${OUT}/v26-tabs.png` });
});

test("splash at phone size", async ({ browser }) => {
  const app = JSON.parse(readFileSync("apps/mobile/app.json", "utf8")) as { expo: { plugins: unknown[] } };
  const splash = app.expo.plugins.find((x): x is [string, { image: string; imageWidth: number; backgroundColor: string }] => Array.isArray(x) && x[0] === "expo-splash-screen")![1];
  const img = readFileSync(`apps/mobile/${splash.image.replace("./", "")}`).toString("base64");
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  await p.setContent(`<body style="margin:0;height:100vh;display:grid;place-items:center;background:${splash.backgroundColor}"><img src="data:image/png;base64,${img}" width="${splash.imageWidth}"></body>`);
  await p.screenshot({ path: `${OUT}/v26-splash.png` });
});
