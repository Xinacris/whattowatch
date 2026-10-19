import { describe, expect, it } from "vitest";
import { decodeLink, encodeLink, linkMatches, sanitizeFilters, type LinkPayload } from "../src";

const payload: LinkPayload = {
  filters: sanitizeFilters({ kind: "both", providers: [337, 8, 1899], genres: ["comedy", "horror"], maxRuntime: 110, era: "new", region: "TR" }),
  seed: "k3x9pq2m",
  voters: [{ name: "Çağla Işık", likes: ["m550", "t1396", "m27205"], seen: ["m603"] }],
};

describe("link codec", () => {
  it("round-trips filters, seed, Turkish names and keys", () => {
    const back = decodeLink(encodeLink(payload));
    expect(back?.seed).toBe(payload.seed);
    expect(back?.filters).toEqual({ ...payload.filters, providers: [8, 337, 1899] });
    expect(back?.voters[0]?.name).toBe("Çağla Işık");
    expect(back?.voters[0]?.likes.sort()).toEqual(["m27205", "m550", "t1396"]);
    expect(back?.voters[0]?.seen).toEqual(["m603"]);
  });
  it("is url-safe and compact", () => {
    const likes = Array.from({ length: 120 }, (_, i) => `m${1000 + i * 37}` as const);
    const token = encodeLink({ ...payload, voters: [{ name: "A", likes, seen: [] }] });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeLessThan(300);
  });
  it("handles zero voters, zero providers, huge ids", () => {
    const p: LinkPayload = { filters: sanitizeFilters({}), seed: "s", voters: [{ name: "", likes: ["m9999999"], seen: [] }] };
    expect(decodeLink(encodeLink(p))?.voters[0]?.likes).toEqual(["m9999999"]);
    expect(decodeLink(encodeLink({ ...p, voters: [] }))?.voters).toEqual([]);
  });
  it("returns null for garbage instead of throwing", () => {
    for (const bad of ["", "!!!", "AAAA", encodeLink(payload).slice(0, 10), "Zm9v"]) expect(decodeLink(bad)).toBeNull();
  });
  it("computes matches client-side across voters, in deck order", () => {
    const voters = [
      { name: "A", likes: ["m1", "m2", "m3"] as const, seen: [] },
      { name: "B", likes: ["m3", "m1"] as const, seen: [] },
    ].map((v) => ({ ...v, likes: [...v.likes] }));
    expect(linkMatches(voters, ["m3", "m2", "m1"])).toEqual(["m3", "m1"]);
    expect(linkMatches([voters[0]!])).toEqual([]);
  });
});
