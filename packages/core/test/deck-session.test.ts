import { describe, expect, it } from "vitest";
import { buildDeckPage, createDeckSession, remaining, sanitizeFilters } from "../src";
import { fakeTmdb } from "./fake-tmdb";

const f = sanitizeFilters({ kind: "movie", region: "TR" });
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("deck session", () => {
  it("loads, swipes, undoes once, and pages ahead near the end", async () => {
    const tmdb = fakeTmdb(60);
    const pages: number[] = [];
    const s = createDeckSession((fl, seed, page, lang) => { pages.push(page); return buildDeckPage(tmdb, fl, seed, page, lang); });
    s.start(f, "seed", "en");
    await flush(); await flush();
    expect(s.getState().cards).toHaveLength(20);
    const first = s.swipe("like");
    expect(s.undo()).toEqual(first);
    expect(s.undo()).toBeNull(); // only once
    for (let i = 0; i < 15; i++) s.swipe("nope");
    await flush(); await flush();
    expect(pages).toEqual([0, 1]);
    expect(remaining(s.getState())).toHaveLength(25);
  });
  it("resumes prior votes and reports errors without throwing", async () => {
    let fail = true;
    const s = createDeckSession(async () => { if (fail) throw new Error("x"); return { cards: [], done: true }; });
    s.start(f, "seed", "en", { m1: "like" });
    await flush();
    expect(s.getState()).toMatchObject({ error: true, votes: { m1: "like" } });
    fail = false;
    await s.fetchMore();
    expect(s.getState()).toMatchObject({ error: false, done: true });
  });
});

describe("fixed decks", () => {
  const card = (key: string) => ({ key, id: Number(key.slice(1)), type: "movie", title: key, year: 2000, poster: null, rating: 7, overview: "", genreIds: [], runtime: 90, genreNames: [], providers: [], cast: [] }) as never;
  it("loads exactly these keys in this order, and more when a room deals them", async () => {
    const asked: string[][] = [];
    const s = createDeckSession(async () => ({ cards: [], done: true }), async (keys) => { asked.push(keys); return keys.filter((k) => k !== "m404").map(card); });
    s.start(f, "seed", "en", {}, { keys: ["m3", "m404", "m1"] });
    await flush();
    expect(s.getState().cards.map((c) => c.key)).toEqual(["m3", "m1"]);
    s.setKeys(["m3", "m404", "m1", "m7"]);
    await flush();
    expect(s.getState().cards.map((c) => c.key)).toEqual(["m3", "m1", "m7"]);
    expect(asked).toEqual([["m3", "m404", "m1"], ["m7"]]);
  });
  it("v1 links stop after the limit", async () => {
    const tmdb = fakeTmdb(60);
    const s = createDeckSession((fl, seed, page, lang) => buildDeckPage(tmdb, fl, seed, page, lang));
    s.start(f, "seed", "en", {}, { limit: 10 });
    await flush(); await flush();
    expect(s.getState()).toMatchObject({ done: true });
    expect(s.getState().cards).toHaveLength(10);
  });
});
