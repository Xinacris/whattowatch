import { expect, test, type Page, type Route } from "@playwright/test";
import { encodeLink, sanitizeFilters, type DeckCard, type ItemKey } from "../packages/core/src";
import { api } from "./helpers";

// "Where it's on": chips open the platform, the JustWatch credit closes the box, the site is dark only.

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3024";
const EDGERUNNERS = "/title/tv/105248";

async function inTR(page: Page, lang: "en" | "tr" = "tr") {
  await page.context().addCookies([{ name: "wtw_lang", value: lang, url: BASE }, { name: "wtw_region", value: "TR", url: BASE }]);
}

/** A finished two-person link whose results are these keys (both said yes). */
function resultsLink(keys: ItemKey[]) {
  const voters = ["Ayşe", "Burak"].map((name) => ({ name, likes: keys, seen: [] }));
  return `/match/link?d=${encodeLink({ filters: sanitizeFilters({ region: "TR" }), seed: "prov1", deck: keys, voters, finished: true })}`;
}

/** Serve the results' cards through `edit`, on top of the real ones. */
async function editCards(page: Page, edit: (c: DeckCard) => DeckCard) {
  await page.route("**/match/api/tmdb/cards**", async (route: Route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, json: ((await res.json()) as DeckCard[]).map(edit) });
  });
}

test("(g) the JustWatch link: TMDB's watch page, new tab, after every chip; chips open the platform", async ({ page }) => {
  await inTR(page, "en");
  const detail = (await (await api(`${BASE}/api/tmdb/title/tv/105248?region=TR&lang=en`)).json()) as { providersLink: string };
  expect(detail.providersLink).toMatch(/^https:\/\/www\.themoviedb\.org\/tv\/105248.*\/watch/);
  await page.goto(EDGERUNNERS);
  const link = page.getByTestId("justwatch-link");
  await expect(link).toHaveText(/JustWatch/);
  await expect(link).toHaveText("All options · JustWatch ↗");
  await expect(link).toHaveAttribute("href", detail.providersLink);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  const chips = page.getByTestId("provider-chip");
  expect(await chips.count()).toBeGreaterThan(0);
  const after = await chips.last().evaluate((c, l) => Boolean(c.compareDocumentPosition(l!) & Node.DOCUMENT_POSITION_FOLLOWING), await link.elementHandle());
  expect(after).toBe(true);
  await expect(page.getByTestId("provider-chip").filter({ hasText: "Netflix" }).first()).toHaveAttribute("href", "https://www.netflix.com");
  // Quiet: paper-dim, no underline until hover or focus.
  expect(await link.evaluate((e) => getComputedStyle(e).textDecorationLine)).toBe("none");
  await link.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  expect(await link.evaluate((e) => getComputedStyle(e).textDecorationLine)).toBe("underline");
});

test("(i) providers but no TMDB watch page: plain attribution, no link; chips without a home are plain", async ({ page }) => {
  await inTR(page, "en");
  await editCards(page, (c) => ({ ...c, providersLink: null, providers: [...c.providers, { id: 2285, name: "JustWatch TV Free", logo: null, kind: "free" }] }));
  await page.goto(resultsLink(["t105248"]));
  const result = page.getByTestId("result");
  await expect(result).toHaveCount(1);
  await expect(result.getByTestId("justwatch-credit")).toHaveText("Data: JustWatch");
  await expect(page.getByTestId("justwatch-link")).toHaveCount(0);
  await expect(result.locator("span[data-testid=provider-chip]").filter({ hasText: "JustWatch TV Free" })).toHaveCount(1);
  await expect(result.locator("a[data-testid=provider-chip]").filter({ hasText: "Netflix" })).toHaveAttribute("href", "https://www.netflix.com");
});

test("(i2) no providers in the region: the not-streaming line, no JustWatch link or credit", async ({ page }) => {
  await inTR(page, "en");
  await editCards(page, (c) => ({ ...c, providers: [] }));
  await page.goto(resultsLink(["t105248"]));
  await expect(page.getByTestId("result")).toContainText("Not on a service in TR right now.");
  await expect(page.getByTestId("justwatch-link")).toHaveCount(0);
  await expect(page.getByTestId("justwatch-credit")).toHaveCount(0);
});

test("(i3) a long provider list at 375: the TR link stays below the chips, on screen and on one line", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await inTR(page, "tr");
  const many = Array.from({ length: 18 }, (_, i) => ({ id: 9000 + i, name: `Platform ${i + 1}`, logo: null, kind: "sub" as const }));
  await editCards(page, (c) => ({ ...c, providers: [...c.providers, ...many] }));
  await page.goto(resultsLink(["t105248"]));
  const link = page.getByTestId("justwatch-link");
  await expect(link).toHaveText("Tüm seçenekler · JustWatch ↗");
  await link.scrollIntoViewIfNeeded();
  const box = (await link.boundingBox())!;
  const last = (await page.getByTestId("provider-chip").last().boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(last.y + last.height);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  const lh = await link.evaluate((e) => parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.5);
  expect(box.height).toBeLessThan(lh * 1.5);
});

test("(j) dark only: color-scheme dark, no light theme anywhere", async ({ page }) => {
  await inTR(page, "en");
  for (const path of ["/", EDGERUNNERS, "/search", "/match/new"]) {
    await page.goto(path);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), path).toBe("dark");
    expect(await page.locator('[data-theme="light"], [data-theme="light"] *').count(), path).toBe(0);
  }
});

test("collection pages credit JustWatch in plain text", async ({ page }) => {
  await inTR(page, "en");
  await page.goto("/collection/2344"); // The Matrix
  await expect(page.getByTestId("justwatch-credit")).toHaveText("Data: JustWatch");
});
