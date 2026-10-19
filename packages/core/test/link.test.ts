import { describe, expect, it } from "vitest";
import { decodeLink, encodeLink, linkStage, sanitizeFilters, swapLink, v1DeckSize, Writer, toBase64Url, GENRES, type LinkPayload, type TitleKey } from "../src";

const filters = sanitizeFilters({ kind: "both", providers: [337, 8, 1899], genres: ["comedy", "horror"], maxRuntime: 110, era: "new", region: "TR" });

/** The v1 writer exactly as it shipped, so old links in people's chats keep opening. */
function encodeV1(p: { seed: string; voters: { name: string; likes: TitleKey[]; seen: TitleKey[] }[] }): string {
  const num = (k: TitleKey) => Number(k.slice(1)) * 2 + (k[0] === "t" ? 1 : 0);
  const keys = (w: Writer, ks: TitleKey[]) => {
    const nums = [...new Set(ks.map(num))].sort((a, b) => a - b);
    w.varint(nums.length);
    let prev = 0;
    for (const n of nums) { w.varint(n - prev); prev = n; }
  };
  const w = new Writer().byte(1).byte(2).byte(1).byte("T".charCodeAt(0)).byte("R".charCodeAt(0)).varint(110);
  w.varint(3).varint(8).varint(329).varint(1562);
  const g = ["comedy", "horror"].map((s) => GENRES.findIndex((x) => x.slug === s));
  w.varint(g.length);
  g.forEach((i) => w.byte(i));
  w.string(p.seed).varint(p.voters.length);
  for (const v of p.voters) { w.string(v.name); keys(w, v.likes); keys(w, v.seen); }
  return toBase64Url(w.done());
}

const deck: TitleKey[] = ["m550", "t1396", "m27205", "m13", "t100088", "m603"];

describe("link codec v2", () => {
  it("keeps the deck in order, including ids that go down", () => {
    const back = decodeLink(encodeLink({ filters, seed: "k3x9pq2m", deck, voters: [], finished: false }));
    expect(back).toMatchObject({ version: 2, seed: "k3x9pq2m", deck, finished: false });
    expect(back?.filters).toEqual({ ...filters, providers: [8, 337, 1899] });
  });
  it("round-trips voters, Turkish names, seen and the results flag", () => {
    const voters = [
      { name: "Çağla Işık", likes: ["m550", "m13"] as TitleKey[], seen: ["m603"] as TitleKey[] },
      { name: "Çağla Işık", likes: ["m13"] as TitleKey[], seen: [] },
    ];
    const back = decodeLink(encodeLink({ filters, seed: "s1", deck, voters, finished: true }));
    expect(back?.voters).toEqual(voters);
    expect(back?.finished).toBe(true);
  });
  it("30 cards, 3 voters stays well under 600 characters", () => {
    const big: TitleKey[] = Array.from({ length: 30 }, (_, i) => (i % 3 ? `m${950_000 - i * 31_337}` : `t${200_000 + i * 4_111}`) as TitleKey);
    const voters = ["Ayşe", "Burak", "Cem Özdemir"].map((name, j) => ({ name, likes: big.filter((_, i) => (i + j) % 3 === 0), seen: big.filter((_, i) => i % 7 === j) }));
    const token = encodeLink({ filters, seed: "k3x9pq2m", deck: big, voters, finished: false });
    console.log(`v2 link, 30 cards + 3 voters: ${token.length} chars`);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeLessThan(600);
    expect(decodeLink(token)?.deck).toEqual(big);
  });
  it("chewed-up links decode to null, never throw", () => {
    const good = encodeLink({ filters, seed: "s", deck, voters: [{ name: "A", likes: deck, seen: [] }], finished: false });
    for (const bad of ["", "!!!", "AAAA", good.slice(0, good.length - 3), good.slice(0, 12), "Zm9v", "CQ"]) expect(decodeLink(bad)).toBeNull();
  });
  it("swap link: same filters, new seed, nobody has swiped", () => {
    const p = decodeLink(encodeLink({ filters, seed: "old", deck, voters: [{ name: "A", likes: [], seen: [] }], finished: true }))!;
    expect(decodeLink(swapLink(p, "new"))).toMatchObject({ seed: "new", deck: [], voters: [], finished: false, filters: p.filters });
  });
});

describe("v1 links", () => {
  const token = encodeV1({ seed: "k3x9pq2m", voters: [{ name: "Çağla", likes: ["m550", "t1396", "m27205"], seen: ["m603"] }] });
  it("still decode, as version 1 with no stored deck", () => {
    const p = decodeLink(token);
    expect(p).toMatchObject({ version: 1, seed: "k3x9pq2m", deck: [], finished: false });
    expect(p?.filters).toEqual({ ...filters, providers: [8, 337, 1899] });
    expect(p?.voters[0]?.likes.sort()).toEqual(["m27205", "m550", "t1396"]);
  });
  it("friend swipes max(10, initiator's votes) cards", () => {
    expect(v1DeckSize(decodeLink(token)!)).toBe(10);
    const many = Array.from({ length: 14 }, (_, i) => `m${i + 1}` as TitleKey);
    expect(v1DeckSize(decodeLink(encodeV1({ seed: "s", voters: [{ name: "A", likes: many, seen: [] }] }))!)).toBe(14);
  });
});

describe("linkStage", () => {
  const p = (voters: number, finished = false): LinkPayload => ({
    version: 2, filters, seed: "s", deck, finished, voters: Array.from({ length: voters }, (_, i) => ({ name: `V${i}`, likes: [], seen: [] })),
  });
  it.each([
    ["new deck", p(0), false, "start"],
    ["friend opens it", p(1), false, "swipe"],
    ["initiator opens their own link", p(1), true, "waiting"],
    ["third person on an add-another link", p(2), false, "swipe"],
    ["a voter reopens the add-another link", p(2), true, "results"],
    ["results link", p(2, true), false, "results"],
    ["results link with one voter", p(1, true), false, "solo"],
  ] as const)("%s", (_n, payload, votedHere, stage) => {
    expect(linkStage(payload, votedHere)).toBe(stage);
  });
});
