import { expect, test, type Browser } from "@playwright/test";
import { finalSwipe, person, sitDown, swipe, topCard } from "./helpers";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3024";

async function turkish(browser: Browser) {
  const ctx = await browser.newContext({ locale: "tr-TR" });
  await ctx.addCookies([{ name: "wtw_lang", value: "tr", url: BASE }, { name: "wtw_region", value: "TR", url: BASE }]);
  return ctx.newPage();
}

test("(g) search \"shrek\": one Shrek series card, no separate Shrek 2 or 3", async ({ browser }) => {
  const p = await person(browser);
  await p.goto("/search?q=shrek");
  const grid = p.getByTestId("results-grid");
  await expect(grid.locator('[data-collection="2150"]')).toHaveCount(1);
  await expect(grid.locator('[data-collection="2150"]')).toContainText(/\d films · 2001–20\d\d/i);
  for (const id of [808, 809, 810, 10192]) await expect(grid.locator(`a[href="/title/movie/${id}"]`)).toHaveCount(0);
});

test("(h) TR, \"yüzüklerin efendisi\": the series card comes first", async ({ browser }) => {
  const p = await turkish(browser);
  await p.goto("/search?q=y%C3%BCz%C3%BCklerin%20efendisi");
  const first = p.getByTestId("search-result").first();
  await expect(first.getByTestId("collection-card")).toHaveAttribute("data-collection", "119");
  await expect(first).toContainText(/3 film · 2001–2003/i);
});

test("(i) two parts on the first page become one card, and never come back later in the deck", async ({ browser }) => {
  // Fresh link: movies, fantasy, US, seed "abc". Page 0 of this deck holds several Harry Potter films.
  const token = "AwAAAFVTAAABDANhYmMAAA";
  const page0 = await (await fetch(`${BASE}/match/api/tmdb/deck?kind=movie&genres=fantasy&region=US&seed=abc&page=0&lang=en`)).json() as { cards: { key: string; title: string; collection?: { parts: { title: string }[] } }[] };
  const series = page0.cards.filter((c) => c.collection);
  expect(series.length).toBeGreaterThan(0);
  const parts = series.flatMap((s) => s.collection!.parts.map((p) => p.title));

  const a = await person(browser);
  await a.goto(`/match/link?d=${token}`);
  await sitDown(a, "Ayşe");
  const seen: string[] = [];
  for (let n = 0; n < 29; n++) {
    const title = await topCard(a);
    if (series.some((s) => s.title === title)) {
      await a.getByRole("group").first().click(); // tap: what's in the box
      await expect(a.getByTestId("series-back")).toBeVisible();
      await expect(a.getByTestId("series-back").locator("li")).toHaveCount(series.find((s) => s.title === title)!.collection!.parts.length);
      await a.getByRole("group").first().click();
    }
    seen.push(await swipe(a, "ArrowLeft"));
  }
  seen.push(await finalSwipe(a, "ArrowLeft"));
  for (const s of series) expect(seen.filter((t) => t === s.title)).toHaveLength(1);
  for (const part of parts) expect(seen).not.toContain(part);
  await expect(a.getByText("Not one yes. Tough crowd.")).toBeVisible();
});

test("(j) a v2 link from before series still opens to its results", async ({ browser }) => {
  // Encoded by the v2 writer: a finished results link, Ayşe and Burak both liked Forrest Gump (m13) and The Shawshank Redemption (m278).
  const v2 = "AgEAAFVTAAAACGUyZXYyb2xkCpgR1AG3EuwUsxCozQbM4h-HrCafAegFAgVBecWfZZZqCgVCdXJha1pqCg";
  const p = await person(browser);
  await p.goto(`/match/link?d=${v2}`);
  await expect(p.getByRole("heading", { name: "You both said yes to these." })).toBeVisible();
  const results = p.getByTestId("result");
  await expect(results).toHaveCount(2);
  await expect(results.nth(0)).toContainText("Forrest Gump");
  await expect(results.nth(1)).toContainText("Shawshank");
});

test("(k) zero-match results never say \"your turn\", in EN or TR", async ({ browser }) => {
  const zero = "AwEAAFVTAAAAB2UyZXplcm8K5Bm-AtMboh_NGPzzCfLTL4vCOe8B3AgCBUF5xZ9lpaoKA0NlbZqqCg";
  for (const [p, heading] of [[await person(browser), "Zero overlap. Impressive, honestly."], [await turkish(browser), "Hiç ortak nokta yok. Takdir ettik açıkçası."]] as const) {
    await p.goto(`/match/link?d=${zero}`);
    await expect(p.getByRole("heading", { name: heading })).toBeVisible();
    await expect(p.locator("body")).not.toContainText(/your turn|sıra sende/i);
    await expect(p.getByTestId("results").getByRole("button").or(p.getByTestId("results").getByRole("link"))).toHaveCount(2); // a results link has no one left to send to
  }
});

type ApiCard = { key: string; type: string; title: string; partOf?: { id: number }; collection?: { partCount: number } };
const deckPage = async (seed: string, page: number, lang = "en") =>
  (await (await fetch(`${BASE}/match/api/tmdb/deck?kind=movie&genres=fantasy&region=US&seed=${seed}&page=${page}&lang=${lang}`)).json() as { cards: ApiCard[] }).cards;

// Fantasy, US, seed "hob1": page 0 holds The Battle of the Five Armies and no other Hobbit film.
const HOB1 = "AwAAAFVTAAABDARob2IxAAA";

test("(l) one Hobbit film on the page is dealt as the Hobbit series, and only once", async ({ browser }) => {
  const a = await person(browser);
  await a.goto(`/match/link?d=${HOB1}`);
  await sitDown(a, "Ayşe");
  const seen: string[] = [];
  for (let n = 0; n < 16; n++) seen.push(await swipe(a, "ArrowLeft"));
  expect(seen).toContain("The Hobbit Collection");
  expect(seen.filter((t) => /^The Hobbit:/.test(t))).toEqual([]);
  expect((await deckPage("hob1", 0, "tr")).map((c) => c.title)).toContain("Hobbit Serisi");
});

test("(m) 30 cards of a fresh deck: no film from a 2+ film series as its own card", async ({ browser }) => {
  const a = await person(browser);
  await a.goto(`/match/link?d=${HOB1}`);
  await sitDown(a, "Ayşe");
  const seen: string[] = [];
  for (let n = 0; n < 29; n++) seen.push(await swipe(a, "ArrowLeft"));
  seen.push(await finalSwipe(a, "ArrowLeft"));
  const cards = (await Promise.all([0, 1, 2, 3].map((p) => deckPage("hob1", p)))).flat();
  const dealt = seen.map((title) => cards.find((c) => c.title === title)).filter((c): c is ApiCard => Boolean(c));
  expect(dealt.length).toBeGreaterThan(25);
  const ids = [...new Set(dealt.flatMap((c) => (!c.collection && c.partOf ? [c.partOf.id] : [])))];
  const series = ids.length ? await (await fetch(`${BASE}/match/api/tmdb/cards?keys=${ids.map((id) => `c:${id}`).join(".")}&region=US&lang=en`)).json() as ApiCard[] : [];
  expect(series.filter((s) => (s.collection?.partCount ?? 0) >= 2).map((s) => s.title)).toEqual([]);
});
