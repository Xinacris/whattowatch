import { expect, test } from "@playwright/test";
import { api } from "./helpers";

// #4: a page for something that doesn't exist answers 404 (the "wrong shelf" page), not 200.

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3024";

const missing = [
  ["unknown movie id", "/title/movie/999999999"],
  ["unknown series id", "/title/tv/999999999"],
  ["a movie id under /title/tv", "/title/tv/1084242"], // Zootopia 2 is a film; there's no series 1084242
  ["non-numeric id", "/title/movie/abc"],
  ["unknown media type", "/title/book/603"],
  ["unknown person", "/person/999999999"],
  ["non-numeric person", "/person/keanu"],
  ["unknown collection", "/collection/999999999"],
  ["a movie id as a collection", "/collection/603"],
] as const;

for (const [name, path] of missing) {
  test(`404: ${name}`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
    await expect(page.getByText(/wrong shelf|yanlış raf/i)).toBeVisible();
  });
}

test("real pages still answer 200", async () => {
  for (const path of ["/title/movie/1084242", "/title/tv/105248", "/person/6384", "/collection/2344"]) expect((await api(`${BASE}${path}`)).status, path).toBe(200);
});
