import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { finalSwipe, sitDown, swipe, swipeRun, topCard } from "./helpers";

// Screenshots, not part of the normal run. `SCREENS=1 pnpm e2e e2e/screens.spec.ts` writes them to
// .screens/ (gitignored). Add README=1 to also refresh the images the README uses, in docs/.
test.skip(!process.env.SCREENS, "screenshots only on request");

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3024";
const OUT = ".screens";
const ANIMATION = "AwAAAFVTAAABCAFmAAA"; // fresh link: movies, animation, US, seed "f"
const FANTASY = "AwAAAFVTAAABDARob2IxAAA"; // fresh link: movies, fantasy, US, seed "hob1"

async function at(browser: Browser, width: number, lang: "en" | "tr", region = "US"): Promise<Page> {
  const ctx = await browser.newContext({ locale: lang === "tr" ? "tr-TR" : "en-US", viewport: { width, height: width < 500 ? 812 : 900 } });
  await ctx.addCookies([{ name: "wtw_lang", value: lang, url: BASE }, { name: "wtw_region", value: region, url: BASE }]);
  return ctx.newPage();
}

const shot = (p: Page, name: string, width: number) => p.screenshot({ path: `${OUT}/${name}-${width}.png` });

/** README images: a screenshot re-encoded as WebP by the browser itself, so they stay small with no image tooling. */
async function readmeShot(p: Page, path: string) {
  const png = (await p.screenshot()).toString("base64");
  const blank = await p.context().newPage();
  const webp = await blank.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
    canvas.getContext("2d")?.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/webp", 0.8));
    const bytes = new Uint8Array(await (blob as Blob).arrayBuffer());
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }, png);
  await blank.close();
  mkdirSync("docs", { recursive: true });
  writeFileSync(path, Buffer.from(webp, "base64"));
}

/** Swipe through a deck, shooting the front (and back, when asked) of the series cards named in `want`. */
async function seriesShots(p: Page, width: number, want: Record<string, { name: string; back: boolean }>) {
  const left = new Set(Object.keys(want));
  for (let n = 0; n < 25 && left.size; n++) {
    const title = await topCard(p);
    const w = want[title];
    if (w) {
      await p.waitForLoadState("networkidle");
      await shot(p, `deck-${w.name}-front`, width);
      if (w.back) {
        await p.getByRole("group").first().click();
        await expect(p.getByTestId("series-back")).toBeVisible();
        await shot(p, `deck-${w.name}-back`, width);
        await p.getByRole("group").first().click();
      }
      left.delete(title);
    }
    await swipe(p, "ArrowLeft");
  }
  expect([...left]).toEqual([]);
}

for (const width of [375, 1280]) {
  test(`v2.3 screens at ${width}`, async ({ browser }) => {
    const en = await at(browser, width, "en");
    for (const [q, name] of [["hobbit", "search-hobbit-en"], ["shrek", "search-shrek"]] as const) {
      await en.goto(`/search?q=${q}`);
      await expect(en.getByTestId("search-result").first()).toBeVisible();
      await en.waitForLoadState("networkidle");
      await shot(en, name, width);
    }
    const tr = await at(browser, width, "tr", "TR");
    await tr.goto("/search?q=hobbit");
    await expect(tr.getByTestId("search-result").first()).toBeVisible();
    await tr.waitForLoadState("networkidle");
    await shot(tr, "search-hobbit-tr", width);

    const anim = await at(browser, width, "en");
    await anim.goto(`/match/link?d=${ANIMATION}`);
    await sitDown(anim, "Ayşe");
    await seriesShots(anim, width, { "Zootopia Collection": { name: "zootopia", back: true }, "Toy Story Collection": { name: "toystory", back: false } });

    const fan = await at(browser, width, "en");
    await fan.goto(`/match/link?d=${FANTASY}`);
    await sitDown(fan, "Ayşe");
    await seriesShots(fan, width, { "The Hobbit Collection": { name: "hobbit", back: true }, "Avatar Collection": { name: "avatar", back: false } });

    const c = await at(browser, width, "en");
    await c.goto(`/match/link?d=${ANIMATION}`);
    await sitDown(c, "Ayşe");
    await swipeRun(c, "LLLNNNN");
    await expect(c.getByTestId("round-counter")).toHaveText(/card 8 of 15/i);
    await shot(c, "counter-8-of-15", width);
    await swipeRun(c, "LNNNNNNNN");
    await expect(c.getByTestId("round-counter")).toHaveText(/card 17 of 20/i);
    await shot(c, "counter-17-of-20", width);
    await finalSwipe(c, "ArrowRight");
    await expect(c.getByTestId("share-screen")).toContainText("You said yes to 5.");
    await shot(c, "share-5th-yes", width);

    if (process.env.README && width === 1280) {
      await en.goto("/");
      await en.waitForLoadState("networkidle");
      await readmeShot(en, "docs/landing.webp");
      await en.goto("/search?q=hobbit");
      await expect(en.getByTestId("search-result").first()).toBeVisible();
      await en.waitForLoadState("networkidle");
      await readmeShot(en, "docs/search-hobbit.webp");
      const deck = await at(browser, width, "en");
      await deck.goto(`/match/link?d=${ANIMATION}`);
      await sitDown(deck, "Ayşe");
      await expect(deck.getByTestId("series-hit")).toBeVisible();
      await deck.waitForLoadState("networkidle");
      await readmeShot(deck, "docs/deck.webp");
    }
  });
}
