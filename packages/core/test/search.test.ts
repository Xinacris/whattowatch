import { describe, expect, it } from "vitest";
import { activeFilterCount, clearFilters, DEFAULT_SEARCH, discoverParams, isSearchMode, loosenOptions, parseSearch, serializeSearch, summaryPasses, type TitleSummary } from "../src";

const now = new Date("2026-10-20T00:00:00Z");
const parse = (qs: string) => parseSearch(new URLSearchParams(qs), now);

describe("search params", () => {
  it("round-trips every filter through the URL", () => {
    const f = parse("q=matrix&type=movie&g=scifi.action&from=1990&to=2005&rt=140&r=7&on=337.8&ol=tr&sort=rating&page=3");
    expect(f).toEqual({ q: "matrix", type: "movie", genres: ["scifi", "action"], yearMin: 1990, yearMax: 2005, runtimeMax: 140, ratingMin: 7, services: [337, 8], turkish: true, sort: "rating", page: 3 });
    expect(parse(serializeSearch(f))).toEqual({ ...f, services: [8, 337] });
  });
  it("defaults serialize to nothing", () => {
    expect(serializeSearch(DEFAULT_SEARCH)).toBe("");
    expect(parse("")).toEqual(DEFAULT_SEARCH);
  });
  it("swaps a min year above the max year", () => {
    expect(parse("from=2010&to=1980")).toMatchObject({ yearMin: 1980, yearMax: 2010 });
  });
  it("drops junk instead of trusting it", () => {
    expect(parse("type=x&g=nope.comedy&from=12&rt=5&r=11&on=a.b&sort=random&page=99")).toEqual({ ...DEFAULT_SEARCH, genres: ["comedy"] });
  });
  it("Turkish queries survive the URL; 1 char and spaces are browse mode", () => {
    const f = parse(`q=${encodeURIComponent("  çağrı   ışık öğüş ")}`);
    expect(f.q).toBe("çağrı ışık öğüş");
    expect(new URLSearchParams(serializeSearch(f)).get("q")).toBe("çağrı ışık öğüş");
    expect(isSearchMode(f)).toBe(true);
    expect(isSearchMode(parse("q=a"))).toBe(false);
    expect(parse("q=%20%20%20").q).toBe("");
  });
  it("counts, clears and loosens filters", () => {
    const f = parse("q=x&r=8&from=1950&to=1960&on=any&sort=rating");
    expect(activeFilterCount(f)).toBe(3);
    expect(clearFilters(f)).toEqual({ ...DEFAULT_SEARCH, q: "x", sort: "rating" });
    expect(loosenOptions(f).map((o) => o.key)).toEqual(["rating", "years", "services"]);
    expect(loosenOptions(f)[0]?.filters.ratingMin).toBeNull();
  });
});

describe("discover params", () => {
  it("maps filters to TMDB discover", () => {
    const p = discoverParams(parse("g=comedy&from=1990&to=1999&rt=100&r=7.5&on=8.337&ol=tr&sort=newest"), "movie", "TR", 2, now);
    expect(p).toMatchObject({
      page: 2, sort_by: "primary_release_date.desc", with_genres: "35", "primary_release_date.gte": "1990-01-01", "primary_release_date.lte": "1999-12-31",
      "with_runtime.lte": 100, "vote_average.gte": 7.5, with_original_language: "tr", with_watch_providers: "8|337", watch_region: "TR",
    });
  });
  it("a genre TV doesn't have rules TV out; 'any service' means streaming somewhere", () => {
    expect(discoverParams(parse("g=horror"), "tv", "US", 1, now)).toBeNull();
    expect(discoverParams(parse("on=any"), "tv", "US", 1, now)).toMatchObject({ with_watch_monetization_types: "flatrate", sort_by: "popularity.desc" });
  });
  it("search mode filters what comes back", () => {
    const s: TitleSummary = { key: "m1", id: 1, type: "movie", title: "Eşkıya", year: 1996, poster: null, rating: 8, overview: "", genreIds: [80], language: "tr" };
    expect(summaryPasses(s, parse("ol=tr&g=crime&to=1999&r=7"))).toBe(true);
    expect(summaryPasses(s, parse("type=tv"))).toBe(false);
    expect(summaryPasses(s, parse("from=2000"))).toBe(false);
    expect(summaryPasses({ ...s, language: "en" }, parse("ol=tr"))).toBe(false);
  });
});
