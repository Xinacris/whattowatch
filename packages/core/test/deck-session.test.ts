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
