import { GENRES, genreIdsFor } from "./genres";
import type { CollectionPart } from "./collections";
import type { MediaType, Provider, TitleSummary } from "./tmdb/models";

/** Folded for "is this exactly what they typed": case, Turkish dotted/dotless i and accents don't matter. */
const exact = (x: string) => x.toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/\s+/g, " ").trim();

/** No votes, no poster or no release date: a placeholder entry ("Shrek 6"), not something to watch tonight. */
export const isThin = (s: Pick<TitleSummary, "rating" | "poster" | "year">) => s.rating === null || !s.poster || s.year === null;

const named = (s: Pick<TitleSummary, "title">, query: string) => query.trim().length > 0 && exact(s.title) === exact(query);

/** Search results: thin titles go to the end, unless the title is exactly the query. */
export function buryThin<T extends Pick<TitleSummary, "rating" | "poster" | "year" | "title">>(items: readonly T[], query: string): T[] {
  const keep = (s: T) => !isThin(s) || named(s, query);
  return [...items.filter(keep), ...items.filter((s) => !keep(s))];
}

/** Suggestions and the deck: thin titles never show, unless the title is exactly the query. */
export const dropThin = <T extends Pick<TitleSummary, "rating" | "poster" | "year" | "title">>(items: readonly T[], query = "") => items.filter((s) => !isThin(s) || named(s, query));

// /search state lives in the URL. Parse anything, serialize only what differs from the defaults.

export type SearchType = "all" | "movie" | "tv";
export type SearchSort = "popular" | "rating" | "newest";

export interface SearchFilters {
  q: string;
  type: SearchType;
  genres: string[];
  yearMin: number | null;
  yearMax: number | null;
  runtimeMax: number | null;
  ratingMin: number | null;
  /** null = anywhere, "any" = on some streaming service in the region, ids = only these. */
  services: number[] | "any" | null;
  turkish: boolean;
  sort: SearchSort;
  page: number; // how many pages are showing; "load more" bumps it
}

export const DEFAULT_SEARCH: SearchFilters = {
  q: "", type: "all", genres: [], yearMin: null, yearMax: null, runtimeMax: null, ratingMin: null, services: null, turkish: false, sort: "popular", page: 1,
};

export const MIN_QUERY = 2;
export const MAX_SEARCH_PAGES = 10;
const FIRST_YEAR = 1900;

interface Query { get(name: string): string | null }

const int = (s: string | null, min: number, max: number): number | null => {
  if (!s || !/^\d{1,4}$/.test(s.trim())) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
};

/** Spaces collapsed, ends trimmed. A query of only spaces is no query. */
export const cleanQuery = (q: string | null | undefined) => (q ?? "").replace(/\s+/g, " ").trim().slice(0, 120);

export function parseSearch(q: Query, now = new Date()): SearchFilters {
  const thisYear = now.getUTCFullYear() + 1;
  let yearMin = int(q.get("from"), FIRST_YEAR, thisYear);
  let yearMax = int(q.get("to"), FIRST_YEAR, thisYear);
  if (yearMin && yearMax && yearMin > yearMax) [yearMin, yearMax] = [yearMax, yearMin];
  const rating = Number(q.get("r"));
  const on = q.get("on");
  const ids = (on ?? "").split(".").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const type = q.get("type");
  const sort = q.get("sort");
  return {
    q: cleanQuery(q.get("q")),
    type: type === "movie" || type === "tv" ? type : "all",
    genres: [...new Set((q.get("g") ?? "").split(".").filter((g) => GENRES.some((x) => x.slug === g)))],
    yearMin,
    yearMax,
    runtimeMax: int(q.get("rt"), 20, 400),
    ratingMin: Number.isFinite(rating) && rating >= 1 && rating <= 9.5 ? Math.round(rating * 2) / 2 : null,
    services: on === "any" ? "any" : ids.length ? [...new Set(ids)].slice(0, 30) : null,
    turkish: q.get("ol") === "tr",
    sort: sort === "rating" || sort === "newest" ? sort : "popular",
    page: int(q.get("page"), 1, MAX_SEARCH_PAGES) ?? 1,
  };
}

/** Stable key order, defaults left out: `/search?` + this. */
export function serializeSearch(f: SearchFilters): string {
  const out = new URLSearchParams();
  const put = (k: string, v: string | number | null | false) => { if (v !== null && v !== false && v !== "") out.set(k, String(v)); };
  put("q", f.q);
  put("type", f.type !== "all" && f.type);
  put("g", f.genres.join("."));
  put("from", f.yearMin);
  put("to", f.yearMax);
  put("rt", f.runtimeMax);
  put("r", f.ratingMin);
  put("on", f.services === "any" ? "any" : f.services ? [...f.services].sort((a, b) => a - b).join(".") : null);
  put("ol", f.turkish && "tr");
  put("sort", f.sort !== "popular" && f.sort);
  put("page", f.page > 1 && f.page);
  return out.toString();
}

export const searchHref = (f: Partial<SearchFilters>) => {
  const qs = serializeSearch({ ...DEFAULT_SEARCH, ...f });
  return qs ? `/search?${qs}` : "/search";
};

export const isSearchMode = (f: SearchFilters) => f.q.length >= MIN_QUERY;

/** How many filters are on (the query, sort and page don't count). */
export function activeFilterCount(f: SearchFilters): number {
  return [f.type !== "all", f.genres.length > 0, f.yearMin !== null || f.yearMax !== null, f.runtimeMax !== null, f.ratingMin !== null, f.services !== null, f.turkish].filter(Boolean).length;
}

export const clearFilters = (f: SearchFilters): SearchFilters => ({ ...DEFAULT_SEARCH, q: f.q, sort: f.sort });

export type LoosenKey = "rating" | "years" | "services" | "runtime" | "genres" | "language" | "type";

/** One-click ways out of an empty result, most likely culprit first. */
export function loosenOptions(f: SearchFilters): { key: LoosenKey; filters: SearchFilters }[] {
  const base = { ...f, page: 1 };
  const opts: { key: LoosenKey; on: boolean; filters: SearchFilters }[] = [
    { key: "rating", on: f.ratingMin !== null, filters: { ...base, ratingMin: null } },
    { key: "years", on: f.yearMin !== null || f.yearMax !== null, filters: { ...base, yearMin: null, yearMax: null } },
    { key: "services", on: f.services !== null, filters: { ...base, services: null } },
    { key: "runtime", on: f.runtimeMax !== null, filters: { ...base, runtimeMax: null } },
    { key: "genres", on: f.genres.length > 0, filters: { ...base, genres: [] } },
    { key: "language", on: f.turkish, filters: { ...base, turkish: false } },
    { key: "type", on: f.type !== "all", filters: { ...base, type: "all" } },
  ];
  return opts.filter((o) => o.on).map(({ key, filters }) => ({ key, filters }));
}

export const searchTypes = (f: SearchFilters): MediaType[] => (f.type === "all" ? ["movie", "tv"] : [f.type]);

const SORT_BY: Record<SearchSort, (t: MediaType) => string> = {
  popular: () => "popularity.desc",
  rating: () => "vote_average.desc",
  newest: (t) => (t === "movie" ? "primary_release_date.desc" : "first_air_date.desc"),
};

/** TMDB discover params for browse mode. `services` resolves to the viewer's ids or "any". Null = no results possible. */
export function discoverParams(f: SearchFilters, type: MediaType, region: string, page: number, now = new Date()): Record<string, string | number> | null {
  const genres = genreIdsFor(f.genres, type);
  if (f.genres.length && !genres.length) return null;
  const date = type === "movie" ? "primary_release_date" : "first_air_date";
  const p: Record<string, string | number> = { page, sort_by: SORT_BY[f.sort](type), include_adult: "false", watch_region: region };
  p["vote_count.gte"] = f.sort === "rating" || f.ratingMin ? 200 : f.sort === "newest" ? 20 : 0;
  if (f.sort === "newest") p[`${date}.lte`] = now.toISOString().slice(0, 10);
  if (genres.length) p.with_genres = genres.join("|");
  if (f.yearMin) p[`${date}.gte`] = `${f.yearMin}-01-01`;
  if (f.yearMax) p[`${date}.lte`] = `${f.yearMax}-12-31`;
  if (f.runtimeMax) p["with_runtime.lte"] = f.runtimeMax;
  if (f.ratingMin) p["vote_average.gte"] = f.ratingMin;
  if (f.turkish) p.with_original_language = "tr";
  if (Array.isArray(f.services)) { p.with_watch_providers = f.services.join("|"); p.with_watch_monetization_types = "flatrate|free|ads"; }
  if (f.services === "any") p.with_watch_monetization_types = "flatrate";
  return p;
}

/** Search mode: TMDB's search takes no filters, so they're applied to what comes back. Runtime needs details, so it's separate. */
export function summaryPasses(s: TitleSummary, f: SearchFilters): boolean {
  if (f.type !== "all" && s.type !== f.type) return false;
  if (f.yearMin && (!s.year || s.year < f.yearMin)) return false;
  if (f.yearMax && (!s.year || s.year > f.yearMax)) return false;
  if (f.ratingMin && (s.rating ?? 0) < f.ratingMin) return false;
  if (f.turkish && s.language !== "tr") return false;
  if (f.genres.length && !genreIdsFor(f.genres, s.type).some((id) => s.genreIds.includes(id))) return false;
  return true;
}

/** Which services "only on my services" means: the picked ids, or for "any" the saved ones (any service when none are saved). */
export function servicesWanted(f: SearchFilters, saved: readonly number[]): number[] | "any" | null {
  if (Array.isArray(f.services)) return f.services;
  if (f.services === "any") return saved.length ? [...saved] : "any";
  return null;
}

/** The filters that need a title's details: runtime and services. */
export function metaPasses(m: { runtime: number | null; providers: readonly Provider[] }, f: Pick<SearchFilters, "runtimeMax">, wanted: number[] | "any" | null): boolean {
  if (f.runtimeMax && (!m.runtime || m.runtime > f.runtimeMax)) return false;
  if (wanted === "any") return m.providers.length > 0;
  if (wanted) return m.providers.some((p) => wanted.includes(p.id));
  return true;
}

/** One part of a series against every filter. A series is in when at least one part is. */
export function partPasses(p: CollectionPart, f: SearchFilters, wanted: number[] | "any" | null): boolean {
  const asSummary = { key: p.key, id: p.id, type: "movie" as const, title: p.title, year: p.year, poster: p.poster, rating: p.rating, overview: "", genreIds: p.genreIds, ...(p.language ? { language: p.language } : {}) };
  return summaryPasses(asSummary, f) && metaPasses(p, f, wanted);
}

/** Interleaves movie and TV pages and drops repeats. */
export function mergeLists(lists: TitleSummary[][]): TitleSummary[] {
  const seen = new Set<string>();
  const out: TitleSummary[] = [];
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) {
    for (const l of lists) { const s = l[i]; if (s && !seen.has(s.key)) { seen.add(s.key); out.push(s); } }
  }
  return out;
}
