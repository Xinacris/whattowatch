import { tmdbImage, yearOf } from "./format";
import { collectionKey, type CollectionKey } from "./item-key";
import type { TitleMeta } from "./movie-meta";
import { titleKey, type DeckCard, type MediaType, type Provider, type TitleKey } from "./tmdb/models";
import type { RawCollection } from "./tmdb/raw";

// A film series as one thing. TMDB calls them collections; only movies have them.

export interface SeriesRef { id: number; name: string }

export interface CollectionPart {
  key: TitleKey;
  id: number;
  title: string;
  year: number | null;
  releaseDate: string;
  poster: string | null;
  rating: number | null;
  genreIds: number[];
  language?: string;
  /** From the meta loader; null/empty when that title's details didn't load. */
  runtime: number | null;
  providers: Provider[];
}

export interface CollectionSummary {
  key: CollectionKey;
  id: number;
  name: string;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  /** Released parts only, oldest first. */
  parts: CollectionPart[];
  partCount: number;
  yearFrom: number | null;
  yearTo: number | null;
  /** Sum of the parts' runtimes, when every part's runtime is known. */
  runtime: number | null;
  rating: number | null;
  genreIds: number[];
}

const today = (now: Date) => now.toISOString().slice(0, 10);

/**
 * Unreleased parts (no date, or a date after today) are left out of everything: the count, the
 * years, the runtime. A missing localized name falls back to `fallbackName`; a missing poster to the first part's.
 */
export function toCollectionSummary(raw: RawCollection, metas: ReadonlyMap<TitleKey, TitleMeta>, opts: { now?: Date; fallbackName?: string } = {}): CollectionSummary {
  const cutoff = today(opts.now ?? new Date());
  const parts: CollectionPart[] = (raw.parts ?? [])
    .filter((p) => p.release_date && p.release_date <= cutoff && (p.media_type ?? "movie") === "movie")
    .sort((a, b) => (a.release_date as string).localeCompare(b.release_date as string))
    .map((p) => {
      const key = titleKey("movie", p.id);
      const meta = metas.get(key);
      return {
        key, id: p.id, title: (p.title ?? p.name ?? "").trim() || "Untitled", year: yearOf(p.release_date), releaseDate: p.release_date as string,
        poster: tmdbImage(p.poster_path, "w500"), rating: p.vote_count ? (p.vote_average ?? null) : null, genreIds: p.genre_ids ?? [],
        ...(p.original_language ? { language: p.original_language } : {}),
        runtime: meta?.runtime ?? null, providers: meta?.providers ?? [],
      };
    });
  const rated = parts.filter((p) => p.rating !== null);
  const years = parts.map((p) => p.year).filter((y): y is number => y !== null);
  return {
    key: collectionKey(raw.id),
    id: raw.id,
    name: raw.name?.trim() || opts.fallbackName?.trim() || "",
    overview: raw.overview ?? "",
    poster: tmdbImage(raw.poster_path, "w500") ?? parts[0]?.poster ?? null,
    backdrop: tmdbImage(raw.backdrop_path, "w780"),
    parts,
    partCount: parts.length,
    yearFrom: years.length ? Math.min(...years) : null,
    yearTo: years.length ? Math.max(...years) : null,
    runtime: parts.length && parts.every((p) => p.runtime) ? parts.reduce((s, p) => s + (p.runtime ?? 0), 0) : null,
    rating: rated.length ? Math.round((rated.reduce((s, p) => s + (p.rating ?? 0), 0) / rated.length) * 10) / 10 : null,
    genreIds: [...new Set(parts.flatMap((p) => p.genreIds))],
  };
}

interface Groupable { type: MediaType; id: number }

export type Grouped<T> =
  | { kind: "title"; item: T; partOf: SeriesRef | null }
  | { kind: "collection"; series: SeriesRef; parts: T[] };

/**
 * One pass, one Map. Two or more parts of a series collapse into one entry where the first part was.
 * A lone part stays a title and says which series it's from. TV never groups.
 */
export function groupIntoCollections<T extends Groupable>(items: readonly T[], collectionOf: (movieId: number) => SeriesRef | null): Grouped<T>[] {
  const out: Grouped<T>[] = [];
  const bySeries = new Map<number, number>(); // series id -> index in out
  for (const item of items) {
    const series = item.type === "movie" ? collectionOf(item.id) : null;
    const at = series ? bySeries.get(series.id) : undefined;
    const entry = at === undefined ? undefined : out[at];
    if (!series || !entry) {
      if (series) bySeries.set(series.id, out.length);
      out.push({ kind: "title", item, partOf: series });
      continue;
    }
    out[at as number] = entry.kind === "title" ? { kind: "collection", series, parts: [entry.item, item] } : { ...entry, parts: [...entry.parts, item] };
  }
  return out;
}

export type ListItem<T> =
  | { kind: "title"; item: T; partOf: SeriesRef | null }
  | { kind: "collection"; summary: CollectionSummary; hits: T[] };

/**
 * Swaps grouped entries for real series. A series that didn't load, or turns out to have fewer
 * than two released parts, goes back to being separate titles: shown ungrouped, never an error.
 */
export function settleGroups<T>(grouped: readonly Grouped<T>[], summaryOf: (id: number) => CollectionSummary | undefined): ListItem<T>[] {
  return grouped.flatMap((g): ListItem<T>[] => {
    if (g.kind === "title") return [g];
    const summary = summaryOf(g.series.id);
    if (summary && summary.partCount >= 2) return [{ kind: "collection", summary, hits: g.parts }];
    return g.parts.map((item) => ({ kind: "title" as const, item, partOf: g.series }));
  });
}

/** Parts that pass `test`. A series passes a filter when at least one part does. */
export const matchingParts = (s: CollectionSummary, test: (p: CollectionPart) => boolean) => s.parts.filter(test);

/** A series as one swipe card. Logos = services that have at least one part (limited to `only` when set). */
export function collectionDeckCard(s: CollectionSummary, only: readonly number[] = []): DeckCard {
  const all = s.parts.flatMap((p) => p.providers);
  const unique = all.filter((p, i) => all.findIndex((q) => q.id === p.id) === i);
  return {
    key: s.key, id: s.id, type: "movie", title: s.name, year: s.yearFrom, poster: s.poster, rating: s.rating, overview: s.overview,
    genreIds: s.genreIds, runtime: s.runtime, genreNames: [], cast: [],
    providers: only.length ? unique.filter((p) => only.includes(p.id)) : unique.slice(0, 4),
    collection: s,
  };
}

/** The series a card belongs to, whether it is the series card or one lone part. */
export const seriesOfCard = (c: Pick<DeckCard, "collection" | "partOf">): number | null => c.collection?.id ?? c.partOf?.id ?? null;
