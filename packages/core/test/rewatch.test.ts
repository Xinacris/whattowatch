import { describe, expect, it } from "vitest";
import {
  castVote, createMemoryStore, decodeLink, encodeLink, firstBook, isLike, picksFrom, picksOf, PRESENCE_MS, roomRound, roundState,
  sanitizeFilters, seenByLine, sharedResults, syncRoom, type Ballot, type DealPage, type ItemKey, type RoomStore, type TitleKey, type Vote,
} from "../src";

// v2.7: swiping up means "seen it, and I'd watch it again". It counts as a yes everywhere,
// and the results say who has seen it. The old "seen" (a skip) keeps meaning a skip.

const deck = ["m1", "m2", "m3", "m4"] as ItemKey[];
const ballot = (votes: (Vote | undefined)[]): Ballot => Object.fromEntries(votes.flatMap((v, i) => (v ? [[deck[i], v]] : [])));

describe("isLike: one lookup for every rule that counts yeses", () => {
  it.each([
    ["like", true], ["rewatch", true], ["nope", false], ["seen", false],
    ["maybe", false], [undefined, false], [null, false], ["constructor", false], [42, false],
  ] as const)("%s → %s", (v, want) => expect(isLike(v)).toBe(want));
});

describe("shared results with seenBy", () => {
  // Two voters, one card each: what A swiped, what B swiped, shared?, seenBy (voter indices).
  it.each([
    ["A rewatch + B yes", "rewatch", "like", true, [0]],
    ["A rewatch + B rewatch", "rewatch", "rewatch", true, [0, 1]],
    ["A yes + B yes", "like", "like", true, []],
    ["A rewatch + B no", "rewatch", "nope", false, null],
    ["legacy seen + yes", "seen", "like", false, null],
    ["legacy seen + rewatch", "seen", "rewatch", false, null],
    ["tampered value + yes", "maybe", "like", false, null],
  ] as const)("%s", (_, a, b, shared, seenBy) => {
    const picks = [picksFrom(["m1"], { m1: a as Vote }), picksFrom(["m1"], { m1: b as Vote })];
    expect(sharedResults(["m1"], picks)).toEqual(shared ? [{ key: "m1", seenBy }] : []);
  });
  it("order is deck order: seenBy is a label, not a ranking signal", () => {
    const a = picksFrom(deck, ballot(["like", "rewatch", "like", "rewatch"]));
    const b = picksFrom(deck, ballot(["rewatch", "like", "like", "rewatch"]));
    expect(sharedResults(deck, [a, b])).toEqual([
      { key: "m1", seenBy: [1] }, { key: "m2", seenBy: [0] }, { key: "m3", seenBy: [] }, { key: "m4", seenBy: [0, 1] },
    ]);
  });
  it("a rewatch on one film counts for its series card, and says who has seen it", () => {
    const seriesOf = (k: ItemKey) => (k === "m2" ? "c:9" as const : null);
    const d = ["c:9", "m5"] as ItemKey[];
    expect(sharedResults(d, [{ likes: ["m2"], seen: [], rewatch: ["m2"] }, { likes: ["c:9"], seen: [] }], seriesOf)).toEqual([{ key: "c:9", seenBy: [0] }]);
  });
});

describe("the round threshold counts a rewatch as a yes", () => {
  const big = Array.from({ length: 20 }, (_, i) => `m${i + 1}`) as TitleKey[];
  const votes = (s: string): Record<string, Vote> => {
    const map: Record<string, Vote> = { L: "like", R: "rewatch", N: "nope", S: "seen" };
    return Object.fromEntries([...s].map((c, i) => [big[i], map[c] as Vote]));
  };
  it.each([
    ["5 yes + 0 rewatch in 15", "LLLLLNNNNNNNNNN", "done"],
    ["2 yes + 3 rewatch in 15", "LLRRRNNNNNNNNNN", "done"],
    ["4 yes in 15", "LLLLNNNNNNNNNNN", "extend"],
    ["1 yes + 3 rewatch in 15", "LRRRNNNNNNNNNNN", "extend"],
  ])("%s → %s", (_, s, phase) => expect(roundState(votes(s), big).phase).toBe(phase));
  it("a rewatch is a card the friend swipes; a legacy seen still isn't", () => {
    expect(roundState(votes("RRS"), big)).toMatchObject({ liked: 2, voted: 2 });
  });
  it("live rooms: rewatches count toward everyone's five", () => {
    const book = { deck: big.slice(0, 15), pool: [], page: 1, exhausted: false };
    const b = (s: string): Ballot => votes(s.padEnd(15, "N"));
    expect(roomRound(book, { a: b("LLRRR"), b: b("RRRRR") }, ["a", "b"]).extendTo).toBeNull();
    expect(roomRound(book, { a: b("LLRRS"), b: b("RRRRR") }, ["a", "b"]).extendTo).toBe(20);
  });
});

describe("live rooms store seenBy with the final results", () => {
  const A = { id: "a", name: "Aslı" };
  const B = { id: "b", name: "Mali" };
  const deal: DealPage = async (_f, _s, page) => ({ keys: Array.from({ length: 20 }, (_, i) => `m${page * 20 + i + 1}` as TitleKey), done: page >= 2 });
  const filters = sanitizeFilters({});
  async function room(): Promise<RoomStore> {
    const s = createMemoryStore();
    await s.create({ code: "ABC234", filters, seed: "s", createdAt: 0, hostId: "a" }, await firstBook(filters, "s", deal));
    return s;
  }
  /** Votes the whole deck: the first five as given, the rest nope. */
  async function swipe(s: RoomStore, who: typeof A, first: Vote[], now: number) {
    const r = await syncRoom(s, "ABC234", who, now, deal);
    if (!r.ok) throw new Error(r.reason);
    let last: Awaited<ReturnType<typeof castVote>> = r;
    for (const [i, key] of r.value.deck.entries()) last = await castVote(s, "ABC234", who, key, first[i] ?? "nope", now, deal);
    return last;
  }
  it("Mali swiped up, Aslı said yes: shared, Mali has seen it; seenBy stays after Mali goes quiet", async () => {
    const s = await room();
    await syncRoom(s, "ABC234", A, 1, deal);
    await syncRoom(s, "ABC234", B, 2, deal);
    await swipe(s, B, ["rewatch", "like", "rewatch", "like", "like"], 3);
    const done = await swipe(s, A, ["like", "like", "like", "like", "rewatch"], 4);
    expect(done.ok && done.value).toMatchObject({ done: true, results: ["m1", "m2", "m3", "m4", "m5"], voters: ["Aslı", "Mali"] });
    expect(done.ok && done.value.seenBy).toEqual({ m1: [1], m3: [1], m5: [0] });
    expect(done.ok && done.value.you).toBe(0);
    expect((await s.get("ABC234"))?.final?.seenBy).toEqual({ m1: ["b"], m3: ["b"], m5: ["a"] });
    // Long after, Mali is gone and only Aslı polls: same list, same seenBy.
    const later = await syncRoom(s, "ABC234", A, 4 + PRESENCE_MS * 4, deal);
    expect(later.ok && later.value).toMatchObject({ results: ["m1", "m2", "m3", "m4", "m5"], seenBy: { m1: [1], m3: [1], m5: [0] } });
  });
  it("a room stored before v2.7: legacy seen votes are still skips, old final results read seenBy as empty", async () => {
    const s = await room();
    await syncRoom(s, "ABC234", A, 1, deal);
    await syncRoom(s, "ABC234", B, 2, deal);
    await swipe(s, B, ["seen", "like", "like", "like", "like", "like"], 2);
    const done = await swipe(s, A, ["like", "like", "like", "like", "like", "like"], 3);
    expect(done.ok && done.value.results).toEqual(["m2", "m3", "m4", "m5", "m6"]);
    expect(done.ok && done.value.seenBy).toEqual({});
    const stored = await s.get("ABC234");
    const old = { ...stored!, final: { ...stored!.final!, seenBy: undefined } };
    const s2 = createMemoryStore();
    await s2.create(old, old.book);
    for (const m of old.members) await s2.upsertMember("ABC234", m);
    await s2.finish("ABC234", old.book.deck.length, old.final);
    const view = await syncRoom(s2, "ABC234", A, 4, deal);
    expect(view.ok && view.value).toMatchObject({ results: ["m2", "m3", "m4", "m5", "m6"], seenBy: {} });
  });
});

describe("link mode: rewatch travels in the link", () => {
  const filters = sanitizeFilters({ kind: "both", region: "TR" });
  const d = ["m120", "m121", "c:119", "t1399", "m550"] as ItemKey[];
  it("round-trips a rewatch next to yes, no and a legacy seen", () => {
    const aslı = picksOf("Aslı", d, { m120: "rewatch", m121: "like", "c:119": "nope", t1399: "seen", m550: "rewatch" });
    expect(aslı).toEqual({ name: "Aslı", likes: ["m120", "m121", "m550"], seen: ["t1399"], rewatch: ["m120", "m550"] });
    const mali = picksOf("Mali", d, { m120: "like", m121: "rewatch", "c:119": "like", t1399: "like", m550: "nope" });
    const p = decodeLink(encodeLink({ filters, seed: "s", deck: d, voters: [aslı, mali], finished: true }));
    expect(p?.version).toBe(4);
    expect(p?.voters).toEqual([aslı, mali]);
    expect(sharedResults(d, p!.voters)).toEqual([{ key: "m120", seenBy: [0] }, { key: "m121", seenBy: [1] }]);
  });
  it("an old v3 link (written before v2.7) decodes exactly as before: seen is a skip, no rewatch", () => {
    const old = decodeLink("AwACAFRSAAAACnYzLWZpeHR1cmUF0AUGB_475ycBBUFzbMSxnQI");
    expect(old).toEqual({ version: 3, filters, seed: "v3-fixture", deck: d, finished: false, voters: [{ name: "Aslı", likes: ["m120", "c:119"], seen: ["m121"] }] });
  });
  it("re-encoding an old link with a new friend keeps the first person's skip a skip", () => {
    const old = decodeLink("AwACAFRSAAAACnYzLWZpeHR1cmUF0AUGB_475ycBBUFzbMSxnQI")!;
    const mali = picksOf("Mali", d, { m120: "like", m121: "rewatch", "c:119": "rewatch" });
    const p = decodeLink(encodeLink({ ...old, voters: [...old.voters, mali] }))!;
    expect(p.voters[0]).toEqual({ name: "Aslı", likes: ["m120", "c:119"], seen: ["m121"], rewatch: [] });
    expect(sharedResults(d, p.voters)).toEqual([{ key: "m120", seenBy: [] }, { key: "c:119", seenBy: [1] }]);
  });
});

describe("seenByLine: who has seen it, in one quiet line", () => {
  const names = ["Aslı", "Mali"];
  it.each([
    ["en", [1], -1, "Mali has seen it"],
    ["en", [1], 1, "You've seen it"],
    ["en", [0, 1], -1, "You've all seen it. Rewatch night."],
    ["tr", [1], -1, "Mali izlemişti"],
    ["tr", [1], 1, "Sen izlemiştin"],
    ["tr", [0, 1], 0, "Hepiniz izlemiştiniz. Tekrar izleme gecesi."],
    ["en", [], -1, null],
  ] as const)("%s %j me=%d → %s", (lang, seen, me, want) => expect(seenByLine(lang, names, [...seen], me)).toBe(want));
  const four = ["Aslı", "Mali", "Defne", "Kerem Can Yılmaz"];
  it.each([
    ["en", [0, 1], -1, "Aslı and Mali have seen it"],
    ["tr", [0, 1], -1, "Aslı ve Mali izlemişti"],
    ["en", [0, 2], 0, "You and Defne have seen it"],
    ["tr", [0, 2], 0, "Sen ve Defne izlemiştiniz"],
    ["en", [1, 2, 3], -1, "Mali, Defne and 1 more have seen it"],
    ["tr", [1, 2, 3], -1, "Mali, Defne ve 1 kişi daha izlemişti"],
    ["en", [1, 2, 3], 3, "You, Mali and 1 more have seen it"],
    ["tr", [1, 2, 3], 3, "Sen, Mali ve 1 kişi daha izlemiştiniz"],
  ] as const)("%s %j me=%d → %s", (lang, seen, me, want) => expect(seenByLine(lang, four, [...seen], me)).toBe(want));
});
