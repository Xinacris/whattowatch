import { expect, type Browser, type Page } from "@playwright/test";
import { protectionHeaders } from "./protection";

/** fetch() for the app's own API from the test runner, through preview protection when a bypass secret is set. */
export const api = (url: string) => fetch(url, { headers: protectionHeaders });

export async function person(browser: Browser, viewport?: { width: number; height: number }): Promise<Page> {
  // A context made by hand doesn't inherit the config's `use`, so it carries the protection headers itself.
  const ctx = await browser.newContext({ locale: "en-US", extraHTTPHeaders: protectionHeaders, ...(viewport ? { viewport } : {}) });
  await ctx.addCookies([{ name: "wtw_lang", value: "en", url: process.env.E2E_BASE_URL ?? "http://localhost:3024" }]);
  return ctx.newPage();
}

export async function setUpNight(page: Page, name: string, mode: "Live room" | "Pass a link") {
  await page.goto("/match/new");
  await page.getByText(mode, { exact: true }).click();
  await page.getByPlaceholder("So they know who said yes").fill(name);
  await page.getByRole("button", { name: mode === "Live room" ? /Open the room/ : /Start swiping/ }).click();
}

export async function sitDown(page: Page, name: string) {
  await page.getByPlaceholder("So they know who said yes").fill(name);
  await page.getByRole("button", { name: /Sit down/ }).click();
}

/** Title of the card on top of the deck. */
export async function topCard(page: Page): Promise<string> {
  const card = page.getByRole("group").first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  return (await card.getAttribute("aria-label")) ?? "";
}

/** Swipe the top card with the keyboard and wait for the next one to take its place. */
export async function swipe(page: Page, key: "ArrowRight" | "ArrowLeft" | "ArrowUp") {
  const before = await topCard(page);
  await page.keyboard.press(key);
  await expect(page.getByRole("group").first()).not.toHaveAttribute("aria-label", before);
  return before;
}

/** Swipe a run of cards: "L" yes, "N" no, "R" rewatch (seen it, would watch again). Returns the titles in order. */
export async function swipeRun(page: Page, seq: string): Promise<string[]> {
  const keys = { L: "ArrowRight", N: "ArrowLeft", R: "ArrowUp" } as const;
  const titles: string[] = [];
  for (const c of seq) titles.push(await swipe(page, keys[c as keyof typeof keys]));
  return titles;
}

/** The last swipe of a run ends the deck, so there's no next card to wait for. */
export async function finalSwipe(page: Page, key: "ArrowRight" | "ArrowLeft" | "ArrowUp"): Promise<string> {
  const title = await topCard(page);
  await page.keyboard.press(key);
  return title;
}

export const counter = (page: Page) => page.getByTestId("round-counter");
