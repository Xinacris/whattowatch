import { describe, expect, it } from "vitest";
import {
  buryThin, dropThin, seriesHit, seriesHitLabel, seriesName,
  appendPage, collectionDeckCard, groupIntoCollections, seriesQuery, withNamedSeries, itemHref, itemKey, mapLimit, matchesFromVoters, parseItemKey, settleGroups, toCollectionSummary,
  type CollectionSummary, type DeckCard, type ItemKey, type MediaType, type RawCollection, type SeriesRef, type TitleMeta,
} from "../src";

const NOW = new Date("2026-10-20T12:00:00Z");
const t = (type: MediaType, id: number) => ({ type, id, key: itemKey(type, id) });

describe("item keys", () => {
  it.each([
    ["m603", { kind: "movie", id: 603 }],
    ["t1396", { kind: "tv", id: 1396 }],
    ["c:2150", { kind: "collection", id: 2150 }],
    ["c2150", null],
    ["x:1", null],
  ] as const)("%s", (key, parsed) => {
    expect(parseItemKey(key)).toEqual(parsed);
    if (parsed) expect(itemKey(parsed.kind, parsed.id)).toBe(key);
  });
  it("links a series to its page", () => {
    expect(itemHref("c:2150")).toBe("/collection/2150");
    expect(itemHref("t1396")).toBe("/title/tv/1396");
  });
});

// Shrek = series 2150 (movies 808, 809, 810), LOTR = 119 (120, 121, 122). 1396 is a TV show.
const SERIES: Record<number, SeriesRef> = { 808: { id: 2150, name: "Shrek" }, 809: { id: 2150, name: "Shrek" }, 810: { id: 2150, name: "Shrek" }, 120: { id: 119, name: "LOTR" }, 121: { id: 119, name: "LOTR" } };
const of = (id: number) => SERIES[id] ?? null;
const shape = (items: ReturnType<typeof groupIntoCollections>) =>
  items.map((g) => (g.kind === "title" ? `${g.item.id}` : `c${g.series.id}[${g.parts.map((p) => p.id).join(",")}]`));

describe("groupIntoCollections", () => {
  it.each([
    ["nothing to group", [t("movie", 1), t("tv", 2)], ["1", "2"]],
    ["two parts collapse at the first one's place", [t("movie", 1), t("movie", 809), t("movie", 5), t("movie", 808)], ["1", "c2150[809,808]", "5"]],
    ["three parts, one card", [t("movie", 808), t("movie", 809), t("movie", 810)], ["c2150[808,809,810]"]],
    ["a lone part becomes its series, where it was", [t("movie", 7), t("movie", 120), t("movie", 8)], ["7", "c119[120]", "8"]],
    ["two series side by side", [t("movie", 120), t("movie", 808), t("movie", 121), t("movie", 809)], ["c119[120,121]", "c2150[808,809]"]],
    ["TV never groups, even with a clashing id", [t("tv", 808), t("tv", 809)], ["808", "809"]],
    ["a deck that is only series", [t("movie", 808), t("movie", 120), t("movie", 810), t("movie", 121)], ["c2150[808,810]", "c119[120,121]"]],
  ])("%s", (_name, items, expected) => {
    expect(shape(groupIntoCollections(items, of))).toEqual(expected);
  });
});

const raw = (id: number, parts: { id: number; date?: string; poster?: string | null; title?: string; rating?: number }[], extra: Partial<RawCollection> = {}): RawCollection => ({
  id, name: `Series ${id}`, poster_path: `/c${id}.jpg`, backdrop_path: null,
  parts: parts.map((p) => ({ id: p.id, title: p.title ?? `Part ${p.id}`, release_date: p.date ?? "", poster_path: p.poster === undefined ? `/p${p.id}.jpg` : p.poster, vote_average: p.rating ?? 7, vote_count: 10, genre_ids: [p.id % 2 ? 35 : 16] })),
  ...extra,
});
const meta = (id: number, runtime: number, providers: number[] = []): TitleMeta => ({
  key: `m${id}`, runtime, collection: null, releaseDate: null, providers: providers.map((p) => ({ id: p, name: `P${p}`, logo: null, kind: "sub" as const })),
});

describe("toCollectionSummary", () => {
  const metas = new Map([[`m808`, meta(808, 90, [8])], [`m809`, meta(809, 93, [337])], [`m810`, meta(810, 93)]] as const);
  it("orders parts by release, sums runtime, averages rating, unions genres", () => {
    const s = toCollectionSummary(raw(2150, [{ id: 810, date: "2007-05-18", rating: 6 }, { id: 808, date: "2001-05-18", rating: 8 }, { id: 809, date: "2004-05-19", rating: 7 }]), metas, { now: NOW });
    expect(s.parts.map((p) => p.id)).toEqual([808, 809, 810]);
    expect(s).toMatchObject({ key: "c:2150", partCount: 3, yearFrom: 2001, yearTo: 2007, runtime: 276, rating: 7, genreIds: [16, 35] });
    expect(s.parts[0]?.providers.map((p) => p.id)).toEqual([8]);
  });
  it("leaves unreleased parts out of the count and the years", () => {
    const s = toCollectionSummary(raw(2150, [{ id: 808, date: "2001-05-18" }, { id: 809, date: "2004-05-19" }, { id: 811, date: "2027-07-01" }, { id: 812 }]), metas, { now: NOW });
    expect(s).toMatchObject({ partCount: 2, yearFrom: 2001, yearTo: 2004 });
  });
  it("runtime is unknown when one part's is", () => {
    const s = toCollectionSummary(raw(2150, [{ id: 808, date: "2001-05-18" }, { id: 999, date: "2010-01-01" }]), metas, { now: NOW });
    expect(s.runtime).toBeNull();
  });
  it("no poster: the first part's; no localized name: the fallback", () => {
    const s = toCollectionSummary(raw(2150, [{ id: 809, date: "2004-05-19" }, { id: 808, date: "2001-05-18" }], { poster_path: null, name: "" }), metas, { now: NOW, fallbackName: "Shrek Collection" });
    expect(s.poster).toContain("/p808.jpg");
    expect(s.name).toBe("Shrek Collection");
  });
});

const summary = (id: number, partCount: number): CollectionSummary => ({
  key: `c:${id}`, id, name: `S${id}`, overview: "", poster: null, backdrop: null, partCount, yearFrom: 2001, yearTo: 2004, runtime: null, rating: 7, genreIds: [],
  parts: Array.from({ length: partCount }, (_, i) => ({ key: `m${id * 10 + i}`, id: id * 10 + i, title: `P${i}`, year: 2001 + i, releaseDate: "", poster: null, rating: 7, genreIds: [], runtime: 90, providers: [] })),
});

describe("settleGroups", () => {
  const grouped = groupIntoCollections([t("movie", 808), t("movie", 1), t("movie", 809), t("movie", 120), t("movie", 121)], of);
  it("a loaded series becomes one item, with the parts that were hit", () => {
    const out = settleGroups(grouped, (id) => (id === 2150 ? summary(2150, 3) : summary(119, 2)));
    expect(out.map((i) => (i.kind === "collection" ? i.summary.key : i.item.key))).toEqual(["c:2150", "m1", "c:119"]);
    expect(out[0]?.kind === "collection" && out[0].hits.map((h) => h.id)).toEqual([808, 809]);
  });
  it("a series that failed to load shows its parts ungrouped", () => {
    const out = settleGroups(grouped, (id) => (id === 2150 ? undefined : summary(119, 2)));
    expect(out.map((i) => (i.kind === "collection" ? i.summary.key : i.item.key))).toEqual(["m808", "m809", "m1", "c:119"]);
  });
  it("a series with only one released part stays a title", () => {
    const out = settleGroups(groupIntoCollections([t("movie", 120), t("movie", 121)], of), () => summary(119, 1));
    expect(out.map((i) => i.kind)).toEqual(["title", "title"]);
    expect(out[0]?.kind === "title" && out[0].partOf).toBe(null); // no tag pointing at a one-film "series"
  });
});

const card = (key: ItemKey, extra: Partial<DeckCard> = {}): DeckCard => ({
  key, id: 1, type: "movie", title: key, year: 2001, poster: null, rating: 7, overview: "", genreIds: [], runtime: 90, genreNames: [], providers: [], cast: [], ...extra,
});

describe("series in the deck", () => {
  it("the series card's logos are services with at least one part", () => {
    const s = summary(2150, 2);
    s.parts[0]!.providers = [{ id: 8, name: "Netflix", logo: null, kind: "sub" }];
    s.parts[1]!.providers = [{ id: 8, name: "Netflix", logo: null, kind: "sub" }, { id: 337, name: "Disney", logo: null, kind: "sub" }];
    expect(collectionDeckCard(s).providers.map((p) => p.id)).toEqual([8, 337]);
    expect(collectionDeckCard(s, [337]).providers.map((p) => p.id)).toEqual([337]);
    expect(collectionDeckCard(s)).toMatchObject({ key: "c:2150", title: "S2150", collection: s });
  });
  it("once a series is dealt, later pages never repeat it, as a part or as the series", () => {
    const shrek = card("c:2150", { collection: summary(2150, 3) });
    const deck = appendPage([card("m1"), shrek], [card("m810", { partOf: { id: 2150, name: "Shrek" } }), card("m2"), card("c:2150", { collection: summary(2150, 3) })]);
    expect(deck.map((c) => c.key)).toEqual(["m1", "c:2150", "m2"]);
    const lone = appendPage([card("m120", { partOf: { id: 119, name: "LOTR" } })], [card("c:119", { collection: summary(119, 3) }), card("m121", { partOf: { id: 119, name: "LOTR" } })]);
    expect(lone.map((c) => c.key)).toEqual(["m120"]);
  });
});

describe("results with series", () => {
  it("a yes on a lone part counts as a yes on its series card", () => {
    const deck: ItemKey[] = ["c:2150", "m1"];
    const seriesOf = (k: ItemKey) => (k === "m809" ? ("c:2150" as const) : null);
    const v3 = { likes: ["c:2150", "m1"] as ItemKey[], seen: [] };
    const v2 = { likes: ["m809"] as ItemKey[], seen: [] };
    expect(matchesFromVoters(deck, [v3, v2], seriesOf)).toEqual(["c:2150"]);
    expect(matchesFromVoters(deck, [v3, v2])).toEqual([]);
  });
  it("a like on a series matches a like on the same series", () => {
    expect(matchesFromVoters(["c:119", "c:2150"], [{ likes: ["c:119", "c:2150"], seen: [] }, { likes: ["c:2150"], seen: [] }])).toEqual(["c:2150"]);
  });
});

describe("mapLimit", () => {
  it("never runs more than the limit at once, keeps order, keeps failures apart", async () => {
    let running = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 2));
      running--;
      if (n === 4) throw new Error("no");
      return n * 2;
    });
    expect(peak).toBe(3);
    expect(out.map((r) => (r.status === "fulfilled" ? r.value : "x"))).toEqual([2, 4, 6, "x", 10, 12, 14, 16, 18, 20]);
  });
});

describe("search: series named by the query", () => {
  it.each([["shrek 2", "shrek"], ["Rocky IV", "Rocky"], ["saw part 3", "saw"], ["yüzüklerin efendisi", "yüzüklerin efendisi"], ["2012", "2012"], ["ocean's 11", "ocean's"]])("%s -> %s", (q, out) => {
    expect(seriesQuery(q)).toBe(out);
  });
  const titles = [t("tv", 84773), t("movie", 121), t("movie", 122), t("movie", 1361), t("movie", 5)];
  const grouped = settleGroups(groupIntoCollections(titles, (id) => (id === 121 || id === 122 ? { id: 119, name: "LOTR" } : id === 1361 ? { id: 141290, name: "Animated" } : null)), (id) => (id === 119 ? summary(119, 3) : summary(id, 2)));
  it("named series lead, ordered by where their first film came up; lone parts are swallowed", () => {
    const out = withNamedSeries(grouped, [summary(141290, 2), summary(119, 3), summary(777, 2)], titles);
    expect(out.map((g) => (g.kind === "collection" ? g.summary.key : g.item.key))).toEqual(["c:119", "c:141290", "c:777", "t84773", "m5"]);
    expect(out[1]?.kind === "collection" && out[1].hits.map((h) => h.id)).toEqual([1361]);
  });
  it("nothing named: the list is unchanged", () => {
    expect(withNamedSeries(grouped, [], titles)).toEqual(grouped);
  });
});

describe("seriesName", () => {
  it.each([
    ["Yüzüklerin Efendisi [Seri]", "Yüzüklerin Efendisi Serisi"],
    ["Hobbit [Seri]", "Hobbit Serisi"],
    ["Oyuncak Hikayesi [Animasyon-Seri]", "Oyuncak Hikayesi Animasyon Serisi"],
    ["Zootropolis [Animasyon Seri]", "Zootropolis Animasyon Seri"],
    ["Avatar [Koleksiyon]", "Avatar Koleksiyon"],
    ["The Hobbit Collection", "The Hobbit Collection"],
    ["  Shrek Serisi ", "Shrek Serisi"],
    ["", ""],
  ])("%s -> %s", (raw, want) => expect(seriesName(raw)).toBe(want));
});

describe("seriesHit: the film that brought a series in", () => {
  const zoo = toCollectionSummary(raw(1, [{ id: 10, date: "2016-03-04", title: "Zootopia" }, { id: 11, date: "2025-11-26", title: "Zootopia 2" }]), new Map(), { now: NOW });
  const hobbit = toCollectionSummary(raw(2, [{ id: 20, date: "2012-12-12", title: "An Unexpected Journey" }, { id: 21, date: "2013-12-11", title: "The Desolation of Smaug" }, { id: 22, date: "2014-12-10", title: "The Battle of the Five Armies" }]), new Map(), { now: NOW });
  it.each([
    ["latest film, out this year: New", zoo, [11], { title: "Zootopia 2", fresh: true }, "Yeni: Zootopia 2"],
    ["latest film, years old: Inside", hobbit, [22], { title: "The Battle of the Five Armies", fresh: false }, "İçinde: The Battle of the Five Armies"],
    ["a middle film: Inside", hobbit, [21, 20], { title: "The Desolation of Smaug", fresh: false }, "İçinde: The Desolation of Smaug"],
  ] as const)("%s", (_n, s, ids, want, label) => {
    const h = seriesHit(s, ids, NOW);
    expect(h).toMatchObject(want);
    expect(h && seriesHitLabel("tr", h)).toBe(label);
  });
  it("no label when the first film brought it in, or the hit isn't released", () => {
    expect(seriesHit(hobbit, [20, 22], NOW)).toBe(null);
    expect(seriesHit(hobbit, [999], NOW)).toBe(null);
  });
  it("EN reads New / Inside", () => {
    expect(seriesHitLabel("en", { title: "Zootopia 2", fresh: true })).toBe("New: Zootopia 2");
    expect(seriesHitLabel("en", { title: "Toy Story 4", fresh: false })).toBe("Inside: Toy Story 4");
  });
});

describe("the v2.3 rule, edge cases", () => {
  const two = (id: number) => (id === 31 ? { id: 3, name: "New Series" } : null);
  it("2 released films + 1 announced: one entry, 2 films", () => {
    const s = toCollectionSummary(raw(3, [{ id: 30, date: "2019-01-01" }, { id: 31, date: "2024-01-01" }, { id: 32, date: "2027-06-01" }]), new Map(), { now: NOW });
    const out = settleGroups(groupIntoCollections([t("movie", 31)], two), () => s);
    expect(out[0]?.kind === "collection" && out[0].summary.partCount).toBe(2);
  });
  it("only one released film, and it's the hit: stays a title", () => {
    const s = toCollectionSummary(raw(3, [{ id: 31, date: "2024-01-01" }, { id: 32, date: "2027-06-01" }]), new Map(), { now: NOW });
    expect(settleGroups(groupIntoCollections([t("movie", 31)], two), () => s).map((i) => i.kind)).toEqual(["title"]);
  });
  it("the series failed to load: a title that still says where it's from", () => {
    const out = settleGroups(groupIntoCollections([t("movie", 31)], two), () => undefined);
    expect(out).toEqual([{ kind: "title", item: t("movie", 31), partOf: { id: 3, name: "New Series" } }]);
  });
  it("one series reached through two films on two pages is dealt once", () => {
    const series = (hit: number) => card("c:3" as ItemKey, { collection: { id: 3 } as CollectionSummary, hit: { id: hit, title: "", year: null, fresh: false } });
    const deck = appendPage(appendPage([], [card("m1"), series(31)]), [series(30), card("m2")]);
    expect(deck.map((c) => c.key)).toEqual(["m1", "c:3", "m2"]);
  });
});

describe("thin titles", () => {
  const item = (title: string, extra: Partial<{ rating: number | null; poster: string | null; year: number | null }> = {}) => ({ title, rating: 7, poster: "/p.jpg", year: 2001, ...extra });
  const list = [item("Shrek 6", { rating: null, year: null, poster: null }), item("Shrek"), item("Shrek Extra", { poster: null }), item("Shrek 2")];
  it.each([
    ["search: thin ones go last", "shrek", ["Shrek", "Shrek 2", "Shrek 6", "Shrek Extra"]],
    ["search: unless the title is exactly the query", "SHREK 6", ["Shrek 6", "Shrek", "Shrek 2", "Shrek Extra"]],
  ])("%s", (_n, q, want) => expect(buryThin(list, q).map((i) => i.title)).toEqual(want));
  it("suggestions and the deck drop them; exact match (any case or accent) survives", () => {
    expect(dropThin(list).map((i) => i.title)).toEqual(["Shrek", "Shrek 2"]);
    expect(dropThin([item("Işık", { rating: null })], "isik").map((i) => i.title)).toEqual(["Işık"]);
  });
});
