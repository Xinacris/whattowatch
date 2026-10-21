import { expect, test, type Page } from "@playwright/test";
import { api } from "./helpers";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3024";
const at = (path: string) => new URL(path, BASE).toString();

/** PNG width and height from the IHDR chunk. */
const pngSize = (b: Buffer) => ({ width: b.readUInt32BE(16), height: b.readUInt32BE(20) });

for (const path of ["/", "/match/new"]) {
  test(`${path}: every <link rel="icon"> answers with an image`, async ({ page }) => {
    await page.goto(path);
    const hrefs = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll((ls) => ls.map((l) => (l as HTMLLinkElement).href));
    expect(hrefs.length).toBeGreaterThanOrEqual(3); // favicon.ico, icon.svg, apple-icon
    for (const href of hrefs) {
      const res = await api(href);
      expect(res.status, href).toBe(200);
      expect(res.headers.get("content-type"), href).toMatch(/^image\//);
    }
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#16110D");
    expect(await page.locator('meta[property="og:image"]').getAttribute("content")).toMatch(/\/opengraph-image/);
  });
}

test("apple-icon, manifest and the link preview image", async () => {
  const apple = await api(at("/apple-icon.png"));
  expect(apple.status).toBe(200);
  expect(pngSize(Buffer.from(await apple.arrayBuffer()))).toEqual({ width: 180, height: 180 });

  const manifest = await api(at("/manifest.webmanifest"));
  expect(manifest.status).toBe(200);
  const m = await manifest.json() as { short_name: string; theme_color: string; icons: { src: string; purpose: string }[] };
  expect(m).toMatchObject({ short_name: "WhatToWatch", theme_color: "#16110D", background_color: "#16110D" });
  expect(m.icons.map((i) => i.purpose)).toContain("maskable");
  for (const i of m.icons) expect((await api(at(i.src))).status, i.src).toBe(200);

  const og = await api(at("/opengraph-image"));
  expect(og.status).toBe(200);
  expect(og.headers.get("content-type")).toBe("image/png");
  expect(pngSize(Buffer.from(await og.arrayBuffer()))).toEqual({ width: 1200, height: 630 });
});

/** The capitals' height: from the top of a W to the baseline, measured in the wordmark's own font. */
async function capHeight(page: Page) {
  return page.getByTestId("wordmark").evaluate(async (el) => {
    await document.fonts.ready;
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = getComputedStyle(el).font;
    return ctx.measureText("W").actualBoundingBoxAscent;
  });
}

for (const width of [375, 1280]) {
  test(`header at ${width}: the logo sits before the wordmark, as tall as its capitals`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    await page.goto("/");
    const home = page.getByRole("link", { name: /WhatToWatch/ }).first();
    const logo = home.getByTestId("logo");
    const word = home.getByTestId("wordmark");
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("aria-hidden", "true");
    const [l, w] = [await logo.boundingBox(), await word.boundingBox()];
    expect(l!.x + l!.width).toBeLessThanOrEqual(w!.x);
    expect(Math.abs(l!.height - (await capHeight(page)))).toBeLessThanOrEqual(2);
    // It takes the wordmark's colour: paper, label on hover.
    const fill = () => logo.evaluate((el) => getComputedStyle(el).fill);
    const ink = () => word.evaluate((el) => getComputedStyle(el).color);
    expect(await fill()).toBe(await ink());
    // Tailwind's hover: only applies where there is hover (not on a phone's touch screen).
    if (await page.evaluate(() => matchMedia("(hover: hover)").matches)) {
      await home.hover();
      await expect.poll(fill).toBe("rgb(255, 194, 26)");
      expect(await ink()).toBe("rgb(255, 194, 26)");
    }
    await ctx.close();
  });
}
