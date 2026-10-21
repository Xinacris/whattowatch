import { expect, test, type Page } from "@playwright/test";
import { counter, finalSwipe, person, setUpNight, sitDown, swipeRun } from "./helpers";

// Local by default (in-memory store). E2E_LIVE=1 also runs it against a deployed Redis store.
test.skip(Boolean(process.env.E2E_BASE_URL) && !process.env.E2E_LIVE, "live rooms run locally unless E2E_LIVE=1");

test("(f) live: one member at 3 yeses deals five more for both; results only when both are through", async ({ browser }) => {
  const a = await person(browser);
  await setUpNight(a, "Ayşe", "Live room");
  const code = (await a.getByTestId("room-code").textContent())?.trim() ?? "";
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  const b = await person(browser);
  await b.goto(`/match/${code}`);
  await sitDown(b, "Burak");
  for (const p of [a, b]) {
    await expect(p.getByTestId("members")).toContainText("Ayşe");
    await expect(p.getByTestId("members")).toContainText("Burak");
    await p.getByRole("button", { name: /Start swiping/ }).click();
    await expect(counter(p)).toHaveText(/Liked 0 \/ 5 · card 1 of 15/i);
  }

  // Ayşe is at 3 of 5, Burak at 5. Nobody stops early in a room.
  const deckA = await swipeRun(a, "LLL" + "N".repeat(11));
  deckA.push(await finalSwipe(a, "ArrowLeft"));
  await expect(a.getByText("Waiting for Burak.")).toBeVisible();
  const deckB = await swipeRun(b, "LLLLL" + "N".repeat(9));
  deckB.push(await finalSwipe(b, "ArrowLeft"));
  expect(deckB).toEqual(deckA); // one shared deck

  for (const p of [a, b]) {
    await expect(counter(p)).toHaveText(/card 16 of 20/i);
    await expect(p.getByTestId("round-banner")).toHaveText("Five more for everyone.");
  }
  await swipeRun(a, "LLNN");
  await finalSwipe(a, "ArrowLeft"); // 5 yeses now
  await expect(a.getByText("Waiting for Burak.")).toBeVisible();
  await expect(a.getByTestId("results")).toHaveCount(0);
  await swipeRun(b, "LLNN");
  await finalSwipe(b, "ArrowLeft");

  for (const p of [a, b]) {
    await expect(p.getByRole("heading", { name: "You both said yes to these." })).toBeVisible();
    await expect(p.getByTestId("result")).toHaveCount(5); // cards 1-3, then 16 and 17
  }
  await expect(a.getByTestId("result").first()).toContainText(deckA[0]!);
});

// v2.6: once the night is over its results never change. Locally the server clock is pushed past
// PRESENCE_MS with the memory store's x-wtw-skew header; against a deployment (Redis) we really wait.
const PRESENCE_MS = 15_000;
async function pastPresence(...pages: Page[]) {
  if (process.env.E2E_BASE_URL) { await pages[0]!.waitForTimeout(PRESENCE_MS + 3_000); return; }
  for (const p of pages) await p.context().setExtraHTTPHeaders({ "x-wtw-skew": String(PRESENCE_MS + 5_000) });
}
const titles = (p: Page) => p.getByTestId("result").locator("p.display").allTextContents();

test("(g) live: results stay after opening a title and coming back, after closing the page, and for someone new", async ({ browser }) => {
  const a = await person(browser);
  await setUpNight(a, "Ayşe", "Live room");
  const code = (await a.getByTestId("room-code").textContent())?.trim() ?? "";
  const b = await person(browser);
  await b.goto(`/match/${code}`);
  await sitDown(b, "Burak");
  for (const p of [a, b]) {
    await expect(p.getByTestId("members")).toContainText("Burak");
    await p.getByRole("button", { name: /Start swiping/ }).click();
  }
  await swipeRun(a, "LLLLLL" + "N".repeat(8));
  await finalSwipe(a, "ArrowLeft");
  await swipeRun(b, "LLLLL" + "N".repeat(9));
  await finalSwipe(b, "ArrowLeft");
  for (const p of [a, b]) await expect(p.getByTestId("result").locator("p.display")).toHaveCount(5);
  await expect(a.getByTestId("result").locator("p.display").first()).not.toBeEmpty();
  const shared = await titles(a);
  expect(await titles(b)).toEqual(shared);

  // A opens the first result's detail page in the same tab; B closes the room page entirely.
  const where = a.getByTestId("result").first().getByRole("link", { name: /Where to watch/ });
  await where.scrollIntoViewIfNeeded();
  const scrolled = await a.evaluate(() => window.scrollY);
  // Remember if "Zero overlap" is ever painted on the page we come back to.
  await a.addInitScript(() => {
    new MutationObserver(() => { if (document.body?.textContent?.includes("Zero overlap")) (window as { __zero?: boolean }).__zero = true; })
      .observe(document, { childList: true, subtree: true, characterData: true });
  });
  await where.click();
  await expect(a).toHaveURL(/\/(title|collection)\//);
  const bCtx = b.context();
  await b.close();
  await pastPresence(a, await bCtx.newPage());

  await a.goBack();
  await expect(a).toHaveURL(new RegExp(`/match/${code}$`));
  await expect(a.getByTestId("result").locator("p.display")).toHaveCount(5);
  expect(await titles(a)).toEqual(shared);
  expect(await a.evaluate(() => (window as { __zero?: boolean }).__zero ?? false)).toBe(false); // no empty flash on the way back
  await expect.soft.poll(() => a.evaluate(() => window.scrollY)).toBeGreaterThan(scrolled - 40);
  expect.soft(await a.evaluate(() => window.scrollY)).toBeLessThan(scrolled + 40);

  const b2 = bCtx.pages()[0]!;
  await b2.goto(`/match/${code}`);
  await expect(b2.getByTestId("result").locator("p.display")).toHaveCount(5);
  expect(await titles(b2)).toEqual(shared);

  // Someone new with the code: the same results, read-only. No lobby, no deck.
  const c = await person(browser);
  await pastPresence(c);
  await c.goto(`/match/${code}`);
  await sitDown(c, "Cem");
  await expect(c.getByTestId("result").locator("p.display")).toHaveCount(5);
  expect(await titles(c)).toEqual(shared);
  await expect(c.getByTestId("members")).toHaveCount(0);
  await expect(c.getByRole("group")).toHaveCount(0);
});
