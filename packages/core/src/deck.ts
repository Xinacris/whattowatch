import { kindsOf, type RoomFilters } from "./filters";
import { genreIdsFor } from "./genres";
import { seededShuffle } from "./random";
import type { TmdbClient } from "./tmdb/client";
import { collectionDeckCard, seriesOfCard } from "./collections";
import { mapLimit, type MetaLoader } from "./movie-meta";
import { createMetaLoader, deckCard, groupList } from "./tmdb/api";
import { toSummaries } from "./tmdb/mappers";
import type { DeckCard, MediaType, TitleKey, TitleSummary } from "./tmdb/models";
import type { RawPage } from "./tmdb/raw";

export interface DiscoverQuery { type: MediaType; params: Record<string, string | number> }

const CLASSIC_BEFORE = "2000-01-01";

function eraParams(type: MediaType, era: RoomFilters["era"], now: Date): Record<string, string | number> {
  const dateField = type === "movie" ? "primary_release_date" : "first_air_date";
  if (era === "new") return { [`${dateField}.gte`]: `${now.getUTCFullYear() - 3}-01-01`, "vote_count.gte": 40 };
  if (era === "classic") return { [`${dateField}.lte`]: CLASSIC_BEFORE, "vote_count.gte": 300 };
  return { "vote_count.gte": 150 };
}

/** TMDB discover queries for one deck page. Empty when the filters rule a type out entirely. */
export function discoverQueries(f: RoomFilters, page: number, now = new Date()): DiscoverQuery[] {
  const out: DiscoverQuery[] = [];
  for (const type of kindsOf(f.kind)) {
    const genres = genreIdsFor(f.genres, type);
    if (f.genres.length && !genres.length) continue; // e.g. "horror" on TV
    const params: Record<string, string | number> = {
      page: page + 1,
      sort_by: f.era === "classic" ? "vote_average.desc" : "popularity.desc",
      include_adult: "false",
      watch_region: f.region,
      ...eraParams(type, f.era, now),
    };
    if (genres.length) params.with_genres = genres.join("|");
    if (f.providers.length) {
      params.with_watch_providers = f.providers.join("|");
      params.with_watch_monetization_types = "flatrate|free|ads";
    }
    if (f.maxRuntime) params["with_runtime.lte"] = f.maxRuntime;
    out.push({ type, params });
  }
  return out;
}

/** Interleaves per-type results, drops dupes and already-seen keys, then shuffles by seed+page. */
export function arrangeDeckPage(lists: TitleSummary[][], seed: string, page: number, exclude: ReadonlySet<TitleKey> = new Set()): TitleSummary[] {
  const merged: TitleSummary[] = [];
  const seen = new Set<TitleKey>(exclude);
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const item = list[i];
      if (!item || seen.has(item.key)) continue;
      seen.add(item.key);
      merged.push(item);
    }
  }
  return seededShuffle(merged, `${seed}:${page}`);
}

export interface DeckPage { page: number; cards: DeckCard[]; done: boolean }

/**
 * One page of the shared deck. Deterministic for (filters, seed, page) as long as TMDB's
 * ordering holds, and matching uses title keys rather than positions so drift is harmless.
 */
export async function buildDeckPage(c: TmdbClient, f: RoomFilters, seed: string, page: number, language: string, meta?: MetaLoader): Promise<DeckPage> {
  const queries = discoverQueries(f, page);
  if (!queries.length) return { page, cards: [], done: true };
  const pages = await Promise.all(queries.map((q) => c.get<RawPage>(`/discover/${q.type}`, q.params)));
  const lists = pages.map((p, i) => toSummaries(p.results, queries[i]?.type));
  const done = pages.every((p) => p.page >= p.total_pages);
  const order = arrangeDeckPage(lists, seed, page);
  const settled = await mapLimit(order, 8, (s) => deckCard(c, s.type, s.id, language, f.region, f.providers));
  const cards = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  // Runtime is checked per part, before grouping: a series is never "too long" for adding up.
  const fits = f.maxRuntime ? cards.filter((card) => !card.runtime || card.runtime <= (f.maxRuntime as number)) : cards;
  const items = await groupList(c, fits, language, meta ?? createMetaLoader(c, language, f.region), (card) => card.partOf ?? null);
  return { page, cards: items.map((i) => (i.kind === "title" ? i.item : collectionDeckCard(i.summary, f.providers))), done };
}

/**
 * Appends a fetched page to what the client already holds, never repeating a title, and never a
 * series: once Shrek (the series, or one lone part) is in the deck, later parts stay out.
 */
export function appendPage(deck: DeckCard[], next: DeckCard[]): DeckCard[] {
  const have = new Set<string>(deck.map((c) => c.key));
  const series = new Set(deck.map(seriesOfCard));
  const out = [...deck];
  for (const card of next) {
    const s = seriesOfCard(card);
    if (have.has(card.key) || (s !== null && series.has(s))) continue;
    have.add(card.key);
    series.add(s);
    out.push(card);
  }
  return out;
}

/** Fetch the next page when this few cards are left unswiped. */
export const PAGE_AHEAD_AT = 5;

export function needsNextPage(remaining: number, done: boolean, loading: boolean): boolean {
  return !done && !loading && remaining <= PAGE_AHEAD_AT;
}
