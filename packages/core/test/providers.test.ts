import { describe, expect, it } from "vitest";
import { providerHome, providerHref } from "../src";

const JW = "https://www.themoviedb.org/tv/105248/watch?locale=TR";

describe("provider links", () => {
  it.each([
    ["Netflix opens Netflix", 8, JW, "https://www.netflix.com"],
    ["every Prime id opens Prime", 119, JW, "https://www.primevideo.com"],
    ["TR platforms are known", 1791, JW, "https://www.exxen.com"],
    ["an unknown platform falls back to JustWatch", 2285, JW, JW],
    ["unknown and no JustWatch page: no link", 2285, null, null],
    ["a known platform still links without a JustWatch page", 337, null, "https://www.disneyplus.com"],
  ])("%s", (_name, id, jw, want) => {
    expect(providerHref(id, jw)).toBe(want);
  });
  it("homes are https and unique per id", () => {
    for (const id of [8, 9, 2, 350, 1899, 342, 1904]) expect(providerHome(id)).toMatch(/^https:\/\//);
  });
});
