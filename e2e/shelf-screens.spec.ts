import { expect, test, type Browser, type Page } from "@playwright/test";

// Not part of the normal run: SCREENS=1 SHELF_TAG=before|after pnpm e2e e2e/shelf-screens.spec.ts
test.skip(!process.env.SCREENS, "screenshots only on request");

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3024";
const OUT = ".screens";

async function at(browser: Browser, width: number): Promise<Page> {
  const ctx = await browser.newContext({ locale: "en-US", viewport: { width, height: width < 500 ? 812 : 900 } });
  await ctx.addCookies([{ name: "wtw_lang", value: "en", url: BASE }, { name: "wtw_region", value: "US", url: BASE }]);
  return ctx.newPage();
}

// Shelves with real (Windows-style) scrollbars: Playwright hides them in headless Chromium by default.
// SHELF_TAG=before|after names the files, e.g. .screens/shelf-after-landing-start-1280.png
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"], args: ["--force-device-scale-factor=1"] } });
const tag = process.env.SHELF_TAG ?? "now";
for (const width of [375, 1280]) {
  test(`shelves at ${width}`, async ({ browser }) => {
    const p = await at(browser, width);
    await p.goto("/");
    const shelf = p.locator("section").filter({ has: p.getByText("On the shelf this week") }).first();
    await expect(shelf.locator("li").first()).toBeVisible();
    await p.waitForLoadState("networkidle");
    await shelf.scrollIntoViewIfNeeded();
    const list = shelf.locator("ul").first();
    const ends = [["start", 0], ["middle", 0.5], ["end", 1]] as const;
    for (const [name, at] of ends) {
      await list.evaluate((el, f) => { el.scrollTo({ left: (el.scrollWidth - el.clientWidth) * f, behavior: "instant" as ScrollBehavior }); }, at);
      await p.waitForTimeout(400);
      await shelf.screenshot({ path: `${OUT}/shelf-${tag}-landing-${name}-${width}.png` });
    }
    const row = p.locator("section").nth(2);
    await row.scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    await row.screenshot({ path: `${OUT}/shelf-${tag}-browse-${width}.png` });
    await p.goto("/title/movie/603");
    const cast = p.locator("section").filter({ has: p.getByRole("heading", { name: /cast/i }) }).first();
    await cast.scrollIntoViewIfNeeded();
    await p.waitForLoadState("networkidle");
    await cast.screenshot({ path: `${OUT}/shelf-${tag}-cast-${width}.png` });
  });
}

// v2.5: a browse row heading at 375 with a mouse (buttons showing), EN and TR.
for (const lang of ["en", "tr"] as const) {
  test(`browse heading at 375 with a mouse (${lang})`, async ({ browser }) => {
    const ctx = await browser.newContext({ locale: lang === "tr" ? "tr-TR" : "en-US", viewport: { width: 375, height: 812 }, hasTouch: false, isMobile: false });
    await ctx.addCookies([{ name: "wtw_lang", value: lang, url: BASE }, { name: "wtw_region", value: "TR", url: BASE }]);
    const p = await ctx.newPage();
    await p.goto("/");
    const row = p.locator("section").filter({ has: p.getByText(lang === "tr" ? "100 dakikanın altında" : "Under 100 minutes") }).first();
    await row.scrollIntoViewIfNeeded();
    await expect(row.getByTestId("shelf-nav")).toBeVisible();
    await p.waitForTimeout(400);
    await row.screenshot({ path: `${OUT}/v25-browse-heading-375-${lang}.png` });
  });
}
