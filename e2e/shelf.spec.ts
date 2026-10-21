import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { staffPick, type TitleSummary } from "../packages/core/src";
import { api } from "./helpers";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3024";

async function landing(browser: Browser, opts: Parameters<Browser["newContext"]>[0] = {}): Promise<{ p: Page; row: Locator; list: Locator }> {
  // A desktop with a mouse unless a test says otherwise: the buttons are for fine pointers.
  const ctx = await browser.newContext({ locale: "en-US", viewport: { width: 1280, height: 900 }, hasTouch: false, isMobile: false, ...opts });
  await ctx.addCookies([{ name: "wtw_lang", value: "en", url: BASE }, { name: "wtw_region", value: "US", url: BASE }]);
  const p = await ctx.newPage();
  await p.goto("/");
  const row = p.getByRole("region", { name: "On the shelf this week" });
  const list = row.getByTestId("shelf-list");
  await expect(list.locator("li").first()).toBeVisible();
  return { p, row, list };
}

const scrollLeft = (list: Locator) => list.evaluate((el) => el.scrollLeft);
/** Waits for smooth scrolling and snapping to finish: scrollLeft stops changing. */
async function settled(list: Locator) {
  let last = -1;
  for (let n = 0; n < 40; n++) {
    const now = await scrollLeft(list);
    if (now === last) return now;
    last = now;
    await list.page().waitForTimeout(120);
  }
  return last;
}

test("(a) 1280: no native scrollbar; prev disabled at the start; next moves and snaps; next disabled at the end", async ({ browser }) => {
  const { row, list } = await landing(browser);
  expect(await list.evaluate((el) => el.offsetHeight - el.clientHeight)).toBe(0);
  const prev = row.getByRole("button", { name: "Previous" });
  const next = row.getByRole("button", { name: "Next" });
  await expect(prev).toBeDisabled();
  await expect(next).toBeEnabled();
  await expect(list).toHaveClass(/fade-right/);

  await next.click();
  const moved = await settled(list);
  expect(moved).toBeGreaterThan(0);
  const offset = await list.evaluate((el) => {
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    return Math.min(...[...el.children].map((li) => Math.abs((li as HTMLElement).offsetLeft - el.scrollLeft - pad)));
  });
  expect(offset).toBeLessThan(2); // a poster's left edge sits on the padding line
  await expect(prev).toBeEnabled();
  await expect(list).toHaveClass(/fade-both/);

  for (let n = 0; n < 30 && (await next.isEnabled()); n++) { await next.click(); await settled(list); }
  await expect(next).toBeDisabled();
  expect(await list.evaluate((el) => el.scrollWidth - el.clientWidth - el.scrollLeft)).toBeLessThan(2);
  await expect(list).toHaveClass(/fade-left/);

  // Hammering "next" at the end doesn't overshoot.
  const before = await scrollLeft(list);
  await next.click({ force: true }).catch(() => {});
  expect(await settled(list)).toBe(before);
});

test("(b) 375, touch: no buttons; the row still scrolls", async ({ browser }) => {
  const { row, list } = await landing(browser, { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  await expect(row.getByTestId("shelf-nav")).toBeHidden();
  await list.evaluate((el) => el.scrollBy({ left: 300, behavior: "instant" as ScrollBehavior }));
  expect(await settled(list)).toBeGreaterThan(0);
  await expect(list).toHaveClass(/fade-(both|left)/);
});

test("(c) keyboard: arrows scroll the focused row; Tab still reaches the posters", async ({ browser }) => {
  const { p, list } = await landing(browser);
  await list.focus();
  await p.keyboard.press("ArrowRight");
  await p.keyboard.press("ArrowRight");
  expect(await settled(list)).toBeGreaterThan(0);
  await p.keyboard.press("Tab");
  expect(await p.evaluate(() => document.activeElement?.closest("[data-testid=shelf-list]") !== null && document.activeElement?.tagName)).toBe("A");
});

test("(d) the staff pick sits, unclipped, on the title staffPick chooses", async ({ browser }) => {
  const { row, list } = await landing(browser);
  const keys = await list.locator("li").evaluateAll((lis) => lis.map((li) => li.getAttribute("data-key")));
  const trending = await (await api(`${BASE}/api/tmdb/trending?lang=en&region=US`)).json() as TitleSummary[];
  const byKey = new Map(trending.map((t) => [t.key, t]));
  const items = keys.map((k) => byKey.get(k as TitleSummary["key"]) ?? { rating: null });
  const want = staffPick(items);
  const sticker = row.getByTestId("staff-pick");
  if (want === -1) { await expect(sticker).toHaveCount(0); return; }
  await expect(sticker).toHaveCount(1);
  expect(await sticker.evaluate((s) => s.closest("li")?.getAttribute("data-key"))).toBe(keys[want]);
  const [s, l] = [await sticker.boundingBox(), await list.boundingBox()];
  expect(s && l && s.y >= l.y).toBe(true);
  // Browse rows never have one.
  await expect(row.page().getByTestId("staff-pick")).toHaveCount(1);
});

test("(e) reduced motion: next still scrolls", async ({ browser }) => {
  const { row, list } = await landing(browser, { reducedMotion: "reduce" });
  await row.getByRole("button", { name: "Next" }).click();
  expect(await settled(list)).toBeGreaterThan(0);
});

test("(f) resizing 1280 → 375 → 1280 keeps the buttons and fades in step", async ({ browser }) => {
  const { p, row, list } = await landing(browser);
  await p.setViewportSize({ width: 375, height: 812 });
  await expect(list).toHaveClass(/fade-right/);
  await p.setViewportSize({ width: 1280, height: 900 });
  await expect(row.getByRole("button", { name: "Previous" })).toBeDisabled();
  await expect(row.getByRole("button", { name: "Next" })).toBeEnabled();
});

test("(g) the cast row scrolls the same way, with no native scrollbar, on this project's device", async ({ page }) => {
  await page.goto("/title/movie/603");
  const list = page.getByRole("list", { name: "Cast" });
  await expect(list.locator("li").first()).toBeVisible();
  expect(await list.evaluate((el) => el.offsetHeight - el.clientHeight)).toBe(0);
  const mouse = await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches);
  if (mouse) await page.getByRole("button", { name: "Next" }).click();
  else {
    await expect(page.getByTestId("shelf-nav").first()).toBeHidden(); // a phone swipes the row instead
    await list.evaluate((el) => el.scrollBy({ left: 200, behavior: "instant" as ScrollBehavior }));
  }
  expect(await settled(list)).toBeGreaterThan(0);
});

test("(h) 375 with a mouse: every row heading stays on one line next to its buttons, in EN and TR", async ({ browser }) => {
  for (const lang of ["en", "tr"] as const) {
    const ctx = await browser.newContext({ locale: lang === "tr" ? "tr-TR" : "en-US", viewport: { width: 375, height: 812 }, hasTouch: false, isMobile: false });
    await ctx.addCookies([{ name: "wtw_lang", value: lang, url: BASE }, { name: "wtw_region", value: "TR", url: BASE }]);
    const p = await ctx.newPage();
    await p.goto("/");
    const headings = p.getByTestId("shelf-heading");
    await expect(headings.first()).toBeVisible();
    expect(await p.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches)).toBe(true);
    for (let i = 0; i < (await headings.count()); i++) {
      const h = headings.nth(i).locator("> *").first();
      await h.scrollIntoViewIfNeeded();
      const { height, line, text } = await h.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { height: el.getBoundingClientRect().height, line: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2, text: el.textContent };
      });
      expect(height, `${lang}: ${text}`).toBeLessThanOrEqual(line + 1);
      const nav = headings.nth(i).locator("xpath=..").getByTestId("shelf-nav");
      if (await nav.count()) await expect(nav).toBeVisible();
    }
    await ctx.close();
  }
});
