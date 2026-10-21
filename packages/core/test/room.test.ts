import { describe, expect, it } from "vitest";
import { castVote, createMemoryStore, fillBook, firstBook, PRESENCE_MS, ROOM_TTL_MS, sanitizeFilters, syncRoom, toView, type Ballot, type DealPage, type Member, type RoomStore, type TitleKey, type Vote } from "../src";

const A = { id: "a", name: "Ayşe" };
const B = { id: "b", name: "Burak" };
const C = { id: "c", name: "Cem" };
const filters = sanitizeFilters({});

/** `total` titles, 20 per page. Counts calls so we can see a deck extend once. */
function dealer(total = 60): DealPage & { calls: number } {
  const deal = (async (_f, _s, page) => {
    deal.calls++;
    const keys = Array.from({ length: 20 }, (_, i) => page * 20 + i + 1).filter((n) => n <= total).map((n) => `m${n}` as TitleKey);
    return { keys, done: (page + 1) * 20 >= total };
  }) as DealPage & { calls: number };
  deal.calls = 0;
  return deal;
}

/** Movies 1 and 2 are parts of series 900; page 1 brings the series card itself. */
function seriesDealer(): DealPage {
  return async (_f, _s, page): ReturnType<DealPage> => page === 0
    ? { keys: ["m1", "m3", "m2", ...Array.from({ length: 7 }, (_, i) => `m${i + 10}` as TitleKey)], done: false, series: { m1: 900, m2: 900 } }
    : { keys: ["c:900", "m40", "m41", "m42", "m43", "m44"], done: true, series: { "c:900": 900 } };
}

async function room(deal = dealer(), store: RoomStore = createMemoryStore()) {
  await store.create({ code: "ABC234", filters, seed: "seed", createdAt: 0, hostId: "a" }, await firstBook(filters, "seed", deal));
  return store;
}

/** Vote the whole current deck: `likes` yeses first, the rest nope. */
async function swipeAll(s: RoomStore, who: typeof A, likes: number, now: number, deal: DealPage, vote: Vote = "nope") {
  const r = await syncRoom(s, "ABC234", who, now, deal);
  if (!r.ok) throw new Error(r.reason);
  let last: Awaited<ReturnType<typeof syncRoom>> = r;
  for (const [i, key] of r.value.deck.entries()) {
    if (r.value.mine[key]) continue;
    last = await castVote(s, "ABC234", who, key, i < likes ? "like" : vote, now, deal);
  }
  return last;
}

describe("live rooms", () => {
  it("deals 15 to start; results stay hidden until everyone is through", async () => {
    const deal = dealer();
    const s = await room(deal);
    await syncRoom(s, "ABC234", A, 1, deal);
    await syncRoom(s, "ABC234", B, 1, deal);
    const a = await swipeAll(s, A, 6, 2, deal);
    expect(a.ok && a.value).toMatchObject({ done: false, results: null, waitingOn: ["Burak"] });
    expect(a.ok && a.value.deck).toHaveLength(15);
    const b = await swipeAll(s, B, 5, 3, deal);
    expect(b.ok && b.value).toMatchObject({ done: true, waitingOn: [], results: ["m1", "m2", "m3", "m4", "m5"] });
  });
  it("one member at 3 yeses deals five more for everyone, once, even when both finish together", async () => {
    const deal = dealer();
    const s = await room(deal);
    await syncRoom(s, "ABC234", A, 1, deal);
    await syncRoom(s, "ABC234", B, 1, deal);
    const view = await syncRoom(s, "ABC234", A, 1, deal);
    const keys = view.ok ? view.value.deck : [];
    for (const k of keys) { await s.setVote("ABC234", "a", k, keys.indexOf(k) < 6 ? "like" : "nope"); await s.setVote("ABC234", "b", k, keys.indexOf(k) < 3 ? "like" : "nope"); }
    const [x, y] = await Promise.all([syncRoom(s, "ABC234", A, 2, deal), syncRoom(s, "ABC234", B, 2, deal)]);
    expect((await s.get("ABC234"))?.book.deck).toHaveLength(20);
    expect([x, y].map((r) => r.ok && r.value.done)).toEqual([false, false]);
    expect(y.ok && y.value.waitingOn.sort()).toEqual(["Ayşe", "Burak"]);
  });
  it("stops at 30 cards, and when the shelf runs dry", async () => {
    const deal = dealer();
    const s = await room(deal);
    for (const v of [A, B]) await syncRoom(s, "ABC234", v, 1, deal);
    for (let round = 0; round < 6; round++) { await swipeAll(s, A, 0, 2, deal); await swipeAll(s, B, 0, 2, deal); }
    const end = await syncRoom(s, "ABC234", A, 3, deal);
    expect(end.ok && end.value).toMatchObject({ done: true, results: [] });
    expect(end.ok && end.value.deck).toHaveLength(30);

    const thin = dealer(7);
    const s2 = await room(thin);
    for (const v of [A, B]) await syncRoom(s2, "ABC234", v, 1, thin);
    await swipeAll(s2, A, 0, 2, thin);
    const done = await swipeAll(s2, B, 0, 2, thin);
    expect(done.ok && done.value).toMatchObject({ done: true });
    expect(done.ok && done.value.deck).toHaveLength(7);
  });
  it("someone leaving stops blocking the rest", async () => {
    const deal = dealer();
    const s = await room(deal);
    for (const v of [A, B, C]) await syncRoom(s, "ABC234", v, 0, deal);
    await swipeAll(s, A, 5, 1, deal);
    const before = await swipeAll(s, B, 5, 2, deal);
    expect(before.ok && before.value.waitingOn).toEqual(["Cem"]);
    const later = PRESENCE_MS + 10;
    await syncRoom(s, "ABC234", A, later, deal);
    const after = await syncRoom(s, "ABC234", B, later, deal);
    expect(after.ok && after.value).toMatchObject({ done: true, results: ["m1", "m2", "m3", "m4", "m5"] });
  });
  it("undo removes a vote, votes off the deck are ignored, only your own ballot comes back", async () => {
    const s = await room();
    await syncRoom(s, "ABC234", B, 0);
    await castVote(s, "ABC234", A, "m1", "like", 0);
    const undone = await castVote(s, "ABC234", A, "m1", null, 1);
    expect(undone.ok && undone.value.mine).toEqual({});
    const off = await castVote(s, "ABC234", A, "m999", "like", 1);
    expect(off.ok && off.value.mine).toEqual({});
    await castVote(s, "ABC234", B, "m2", "nope", 1);
    const a = await syncRoom(s, "ABC234", A, 1);
    expect(a.ok && a.value.mine).toEqual({});
  });
  it("typo, missing and expired rooms say why", async () => {
    const s = await room();
    expect(await syncRoom(s, "ABC23", A, 0)).toEqual({ ok: false, reason: "bad_code" });
    expect(await syncRoom(s, "ZZZ999", A, 0)).toEqual({ ok: false, reason: "not_found" });
    expect(await syncRoom(s, "ABC234", A, ROOM_TTL_MS + 1)).toEqual({ ok: false, reason: "expired" });
  });
});

describe("people who leave after finishing (#7)", () => {
  it("A and B finish, B goes quiet, C finishes later: B's votes still count", async () => {
    const deal = dealer();
    const s = await room(deal);
    for (const v of [A, B, C]) await syncRoom(s, "ABC234", v, 0, deal);
    await swipeAll(s, A, 6, 1, deal);
    const r = await syncRoom(s, "ABC234", B, 1, deal);
    const deck = r.ok ? r.value.deck : [];
    for (const [i, k] of deck.entries()) await castVote(s, "ABC234", B, k, i < 5 ? "like" : i === 5 ? "nope" : "nope", 1, deal);
    await castVote(s, "ABC234", B, "m1", "nope", 1, deal); // B says no to m1
    const later = PRESENCE_MS + 10;
    const c = await swipeAll(s, C, 6, later, deal);
    expect(c.ok && c.value).toMatchObject({ done: true, waitingOn: [], results: ["m2", "m3", "m4", "m5"] });
    expect((await s.get("ABC234"))?.book.deck).toHaveLength(15); // B never triggers or blocks an extension
  });

  const deck = Array.from({ length: 20 }, (_, i) => `m${i + 1}` as TitleKey);
  const all = (n: number, likes: number): Ballot => Object.fromEntries(deck.slice(0, n).map((k, i) => [k, i < likes ? "like" : "nope"]));
  const member = (id: string, lastSeen: number, dealt?: number): Member => ({ id, name: id.toUpperCase(), joinedAt: id.charCodeAt(0), lastSeen, ...(dealt === undefined ? {} : { dealt }) });
  const view = (members: Member[], ballots: Record<string, Ballot>, size = 15) =>
    toView({ code: "ABC234", filters, seed: "s", createdAt: 0, hostId: "a", members, ballots, book: { deck: deck.slice(0, size), pool: [], page: 1, exhausted: false } }, "a", 100_000);
  const gone = 100_000 - PRESENCE_MS - 1;
  it.each([
    ["a departed member who finished counts", [member("a", 100_000), member("c", 100_000), member("b", gone, 15)], { a: all(15, 6), b: all(15, 2), c: all(15, 6) }, 15, ["m1", "m2"], []],
    ["a departed member who didn't finish is left out, as before", [member("a", 100_000), member("c", 100_000), member("b", gone, 15)], { a: all(15, 6), b: all(9, 2), c: all(15, 6) }, 15, ["m1", "m2", "m3", "m4", "m5", "m6"], []],
    ["finished the 15 they were dealt, the deck grew to 20 after: still counted, never waited on", [member("a", 100_000), member("c", 100_000), member("b", gone, 15)], { a: all(20, 6), b: all(15, 3), c: all(20, 6) }, 20, ["m1", "m2", "m3"], []],
    ["stored before `dealt` existed: finished means the whole deck", [member("a", 100_000), member("c", 100_000), member("b", gone)], { a: all(15, 6), b: all(15, 2), c: all(15, 6) }, 15, ["m1", "m2"], []],
    ["a departed member is never in waitingOn", [member("a", 100_000), member("c", 100_000), member("b", gone, 15)], { a: all(15, 6), b: all(15, 2), c: all(10, 6) }, 15, null, ["C"]],
  ] as const)("%s", (_name, members, ballots, size, results, waitingOn) => {
    const v = view([...members], ballots as unknown as Record<string, Ballot>, size);
    expect(v.results).toEqual(results);
    expect(v.waitingOn).toEqual(waitingOn);
    expect(v.members.map((m) => m.id)).not.toContain("b");
  });
  it("one present, one departed and finished: the departed member makes it a pair", () => {
    const v = view([member("a", 100_000), member("b", gone, 15)], { a: all(15, 6), b: all(15, 5) });
    expect(v.results).toEqual(["m1", "m2", "m3", "m4", "m5"]);
  });
});

describe("dealing film series", () => {
  it("never deals a second card from a series already in the room deck", async () => {
    const deal = seriesDealer();
    const first = await fillBook({ deck: [], pool: [], page: 0, exhausted: false }, 10, filters, "seed", deal);
    const tens = Array.from({ length: 7 }, (_, i) => `m${i + 10}`);
    expect(first.deck).toEqual(["m1", "m3", ...tens, "m40"]);
    expect(first.series).toEqual([900]);
    const grown = await fillBook(first, 15, filters, "seed", deal);
    expect(grown.deck).toEqual(["m1", "m3", ...tens, "m40", "m41", "m42", "m43", "m44"]);
    expect(grown).toMatchObject({ exhausted: true, pool: [] });
  });
  it("books stored before series existed still extend (they just can't know m1's series)", async () => {
    const grown = await fillBook({ deck: ["m1"], pool: [], page: 1, exhausted: false }, 3, filters, "seed", seriesDealer());
    expect(grown.deck).toEqual(["m1", "c:900", "m40"]);
  });
});
