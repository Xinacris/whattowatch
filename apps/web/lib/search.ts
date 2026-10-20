import "server-only";
import {
  browse, collectionSummaries, groupList, seriesQuery, withNamedSeries, isSearchMode, matchingParts, metaPasses, partPasses, searchCollections, searchPages, servicesWanted, summaryPasses,
  type CollectionSummary, type ListItem, type Provider, type SearchFilters, type SearchRun, type SeriesRef, type TitleMeta, type TitleSummary,
} from "@wtw/core";
import { metaLoader, tmdb } from "@wtw/ui/server";

export type ResultEntry =
  | { kind: "title"; item: TitleSummary; logos: Provider[] | null; partOf: SeriesRef | null }
  | {
    kind: "collection";
    summary: CollectionSummary;
    logos: Provider[];
    /** The part the search hit first ("shrek 2"), shown on the card. */
    hit: { id: number; title: string; year: number | null } | null;
    /** Parts that pass the filters, when that's not all of them. */
    matching: number | null;
    /** The one service picked, for "2 of 5 on Netflix". */
    service: string | null;
  };

const MAX_LOGOS = 3;

function logosFrom(providers: readonly Provider[], only: readonly number[]): Provider[] {
  return (only.length ? providers.filter((p) => only.includes(p.id)) : providers).slice(0, MAX_LOGOS);
}

/** Series whose name matches the query go first, even if TMDB's title search missed every part. "shrek 2" also asks for "shrek". */
async function namedSeries(q: string, language: string, region: string): Promise<CollectionSummary[]> {
  const queries = [...new Set([q, seriesQuery(q)])].filter((x) => x.length >= 2);
  const found = (await Promise.all(queries.map((x) => searchCollections(tmdb(), x, language).catch(() => [])))).flat();
  const ids = [...new Set(found.map((c) => c.id))].slice(0, 2);
  const summaries = await collectionSummaries(tmdb(), ids, language, metaLoader(language, region));
  return [...summaries.values()].filter((s) => s.partCount >= 2);
}

/**
 * Browse = TMDB discover, which applies every filter itself. Search = TMDB search, then our filters.
 * Either way: parts of one series become one entry, and that entry is in when at least one part
 * passes. Details come from the shared meta loader, fetched once and cached for a week.
 */
export async function runSearch(f: SearchFilters, region: string, language: string, saved: number[]) {
  const searching = isSearchMode(f);
  const meta = metaLoader(language, region);
  const [run, named]: [SearchRun, CollectionSummary[]] = await Promise.all([
    searching ? searchPages(tmdb(), f, language) : browse(tmdb(), f, region, language),
    searching ? namedSeries(f.q, language, region) : Promise.resolve([]),
  ]);
  const [metas, grouped] = await Promise.all([meta(run.titles.map((s) => s.key)), groupList(tmdb(), run.titles, language, meta)]);
  const wanted = servicesWanted(f, saved);
  const only = Array.isArray(wanted) ? wanted : saved;
  const ordered = withNamedSeries(grouped, named, run.titles);
  const items = ordered.flatMap((g) => entryFor(g, metas, f, wanted, only));
  return { ...run, items };
}

function entryFor(g: ListItem<TitleSummary>, metas: Map<string, TitleMeta>, f: SearchFilters, wanted: number[] | "any" | null, only: number[]): ResultEntry[] {
  const searching = isSearchMode(f);
  if (g.kind === "title") {
    const m = metas.get(g.item.key);
    if (searching && !summaryPasses(g.item, f)) return [];
    if (searching && (f.runtimeMax !== null || wanted !== null) && (!m || !metaPasses(m, f, wanted))) return [];
    return [{ kind: "title", item: g.item, logos: m ? logosFrom(m.providers, only) : null, partOf: g.partOf }];
  }
  const s = g.summary;
  const passing = matchingParts(s, (p) => partPasses(p, f, wanted));
  if (!passing.length) return [];
  const all = passing.flatMap((p) => p.providers);
  const unique = all.filter((p, i) => all.findIndex((q) => q.id === p.id) === i);
  const first = g.hits[0];
  const one = Array.isArray(wanted) && wanted.length === 1 ? wanted[0] : null;
  return [{
    kind: "collection", summary: s, logos: logosFrom(unique, only),
    hit: first && first.id !== s.parts[0]?.id ? { id: first.id, title: first.title, year: first.year } : null,
    matching: passing.length < s.partCount ? passing.length : null,
    service: one ? (unique.find((p) => p.id === one)?.name ?? null) : null,
  }];
}
