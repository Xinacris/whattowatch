import { expect, test, type Browser, type Page } from "@playwright/test";
import { sitDown, swipe, swipeRun, topCard } from "./helpers";

// Screenshots for docs/screens. Not part of the normal run: SCREENS=1 pnpm e2e e2e/screens.spec.ts
test.skip(!process.env.SCREENS, "screenshots only on request");

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3024";
const OUT = "docs/screens";
const FANTASY = "AwAAAFVTAAABDANhYmMAAA"; // fresh link: movies, fantasy, US, seed "abc"
const SERIES_RESULTS = "AwEAAFVTAAAACWUyZXNlcmllcwroZJlktgy1B6IazRjCEr4CjRHcCAIFQXnFn2VlqgoFQnVyYWulqQo"; // both liked Shrek (series) and Forrest Gump
const ZERO = "AwEAAFVTAAAAB2UyZXplcm8K5Bm-AtMboh_NGPzzCfLTL4vCOe8B3AgCBUF5xZ9lpaoKA0NlbZqqCg";

async function at(browser: Browser, width: number, lang: "en" | "tr", region = "US"): Promise<Page> {
  const ctx = await browser.newContext({ locale: lang === "tr" ? "tr-TR" : "en-US", viewport: { width, height: width < 500 ? 812 : 900 } });
  await ctx.addCookies([{ name: "wtw_lang", value: lang, url: BASE }, { name: "wtw_region", value: region, url: BASE }]);
  return ctx.newPage();
}

const shot = (p: Page, name: string, width: number, full = false) => p.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: full });

for (const width of [375, 1280]) {
  test(`screens at ${width}`, async ({ browser }) => {
    const p = await at(browser, width, "en");
    await p.goto("/");
    await p.waitForLoadState("networkidle");
    await shot(p, "landing", width);
    await p.goto("/search?q=shrek");
    await expect(p.locator('[data-collection="2150"]').first()).toBeVisible();
    await p.waitForLoadState("networkidle");
    await shot(p, "search-shrek", width);

    const tr = await at(browser, width, "tr", "TR");
    await tr.goto("/search?q=y%C3%BCz%C3%BCklerin%20efendisi");
    await expect(tr.getByTestId("collection-card").first()).toBeVisible();
    await tr.waitForLoadState("networkidle");
    await shot(tr, "search-lotr-tr", width);

    const d = await at(browser, width, "en");
    await d.goto(`/match/link?d=${FANTASY}`);
    await sitDown(d, "Ayşe");
    const page0 = await (await fetch(`${BASE}/match/api/tmdb/deck?kind=movie&genres=fantasy&region=US&seed=abc&page=0&lang=en`)).json() as { cards: { title: string; collection?: unknown }[] };
    const series = page0.cards.filter((c) => c.collection).map((c) => c.title);
    for (let n = 0; n < 25 && !series.includes(await topCard(d)); n++) await swipe(d, "ArrowLeft");
    await expect(d.getByRole("group").first().getByTestId("series-label")).toBeVisible();
    await d.waitForTimeout(500);
    await shot(d, "deck-series-front", width);
    await d.getByRole("group").first().click();
    await expect(d.getByTestId("series-back")).toBeVisible();
    await shot(d, "deck-series-back", width);

    const s = await at(browser, width, "en");
    await s.goto(`/match/link?d=${FANTASY}`);
    await sitDown(s, "Ayşe");
    await topCard(s);
    await swipeRun(s, "LLLNNNNNN");
    await s.keyboard.press("ArrowLeft");
    await expect(s.getByTestId("share-screen")).toBeVisible();
    await shot(s, "share", width);

    const r = await at(browser, width, "en");
    await r.goto(`/match/link?d=${SERIES_RESULTS}`);
    await expect(r.getByTestId("start-with")).toBeVisible();
    await r.waitForLoadState("networkidle");
    await shot(r, "results-series", width, true);

    const z = await at(browser, width, "en");
    await z.goto(`/match/link?d=${ZERO}`);
    await expect(z.getByTestId("results")).toBeVisible();
    await shot(z, "results-zero", width);
  });
}
