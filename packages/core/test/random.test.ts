import { describe, expect, it } from "vitest";
import { makeSeed, seededShuffle } from "../src";

describe("seededShuffle", () => {
  const items = Array.from({ length: 50 }, (_, i) => i);
  it("is deterministic for a seed", () => {
    expect(seededShuffle(items, "couch")).toEqual(seededShuffle(items, "couch"));
  });
  it("differs across seeds and keeps every item", () => {
    const a = seededShuffle(items, "couch");
    expect(a).not.toEqual(seededShuffle(items, "sofa"));
    expect([...a].sort((x, y) => x - y)).toEqual(items);
  });
  it("does not mutate input and handles empty", () => {
    const copy = items.slice();
    seededShuffle(items, "x");
    expect(items).toEqual(copy);
    expect(seededShuffle([], "x")).toEqual([]);
  });
  it("makes url-safe seeds", () => {
    expect(makeSeed()).toMatch(/^[a-z2-9]{8}$/);
  });
});
