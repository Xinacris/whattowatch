import { describe, expect, it } from "vitest";
import { appendPage, arrangeDeckPage, buildDeckPage, discoverQueries, needsNextPage, sanitizeFilters, toSummaries } from "../src";
import { fakeTmdb, movie } from "./fake-tmdb";

const f = sanitizeFilters({ kind: "both", region: "TR", providers: [8], genres: ["comedy"], maxRuntime: 120, era: "new" });

describe("discoverQueries", () => {
  it("builds one query per type with provider, genre and runtime filters", () => {
    const qs = discoverQueries(f, 0, new Date("2026-06-01"));
    expect(qs.map((q) => q.type)).toEqual(["movie", "tv"]);
    expect(qs[0]?.params).toMatchObject({ page: 1, watch_region: "TR", with_watch_providers: "8", with_genres: "35", "with_runtime.lte": 120, "primary_release_date.gte": "2023-01-01" });
    expect(qs[1]?.params).toHaveProperty("first_air_date.gte");
  });
  it("zero providers means no provider filter", () => {
    const q = discoverQueries(sanitizeFilters({ kind: "movie" }), 2)[0];
    expect(q?.params.with_watch_providers).toBeUndefined();
    expect(q?.params.page).toBe(3);
  });
  it("drops TV when the only genres have no TV equivalent", () => {
    expect(discoverQueries(sanitizeFilters({ kind: "both", genres: ["horror"] }), 0).map((q) => q.type)).toEqual(["movie"]);
    expect(discoverQueries(sanitizeFilters({ kind: "tv", genres: ["horror"] }), 0)).toEqual([]);
  });
});

describe("arrangeDeckPage", () => {
  const list = toSummaries([movie(1), movie(2), movie(3), movie(2)]);
  it("de-dupes, excludes, and shuffles deterministically", () => {
    const a = arrangeDeckPage([list, list], "seed", 0, new Set(["m3"]));
    expect(a.map((s) => s.key).sort()).toEqual(["m1", "m2"]);
    expect(arrangeDeckPage([list], "seed", 0)).toEqual(arrangeDeckPage([list], "seed", 0));
  });
});

describe("buildDeckPage", () => {
  it("returns the same deck for the same seed (late joiner sees what everyone saw)", async () => {
    const a = await buildDeckPage(fakeTmdb(), f, "abc", 0, "en-US");
    const b = await buildDeckPage(fakeTmdb(), f, "abc", 0, "en-US");
    expect(a.cards.map((c) => c.key)).toEqual(b.cards.map((c) => c.key));
    expect(a.cards).toHaveLength(40);
    expect(a.done).toBe(false);
  });
  it("hydrates cards with runtime, two genres and only the room's services", async () => {
    const { cards } = await buildDeckPage(fakeTmdb(), f, "abc", 0, "en-US");
    const card = cards[0]!;
    expect(card.genreNames).toEqual(["Comedy", "Drama"]);
    expect(card.providers.map((p) => p.id)).toEqual([8]);
    expect(card.cast).toEqual(["Şükrü Özyıldız"]);
  });
  it("flags the last page as done, and an empty page past the end", async () => {
    expect((await buildDeckPage(fakeTmdb(45), f, "abc", 2, "en-US")).done).toBe(true);
    const past = await buildDeckPage(fakeTmdb(45), f, "abc", 5, "en-US");
    expect(past.cards).toEqual([]);
    expect(past.done).toBe(true);
  });
  it("drops cards over the runtime limit and survives a failed detail fetch", async () => {
    const tmdb = fakeTmdb(20, { runtime: (id) => (id % 2 ? 150 : 90), failIds: [2] });
    const { cards } = await buildDeckPage(tmdb, sanitizeFilters({ kind: "movie", maxRuntime: 120, region: "TR" }), "s", 0, "en-US");
    expect(cards.every((c) => (c.runtime ?? 0) <= 120)).toBe(true);
    expect(cards.map((c) => c.id)).not.toContain(2);
    expect(cards).toHaveLength(9);
  });
  it("returns done with no TMDB calls when filters rule everything out", async () => {
    const tmdb = fakeTmdb();
    const page = await buildDeckPage(tmdb, sanitizeFilters({ kind: "tv", genres: ["romance"] }), "s", 0, "en-US");
    expect(page).toEqual({ page: 0, cards: [], done: true });
    expect(tmdb.calls).toEqual([]);
  });
});

describe("paging", () => {
  it("appends without repeats and pages ahead at 5 left", async () => {
    const { cards } = await buildDeckPage(fakeTmdb(), f, "abc", 0, "en-US");
    expect(appendPage(cards.slice(0, 10), cards.slice(5, 15))).toHaveLength(15);
    expect(needsNextPage(5, false, false)).toBe(true);
    expect(needsNextPage(6, false, false)).toBe(false);
    expect(needsNextPage(0, true, false)).toBe(false);
    expect(needsNextPage(2, false, true)).toBe(false);
  });
});
