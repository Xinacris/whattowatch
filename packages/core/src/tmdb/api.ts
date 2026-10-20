import type { TmdbClient } from "./client";
import { groupIntoCollections, settleGroups, toCollectionSummary, type CollectionSummary, type ListItem, type SeriesRef } from "../collections";
import { mapLimit, toTitleMeta, type MetaLoader, type TitleMeta } from "../movie-meta";
import { toCollection, toDetail, toPerson, toPersonSummary, toSummaries, toProviders, toDeckCard } from "./mappers";
import { parseTitleKey, titleKey, type CollectionDetail, type DeckCard, type MediaType, type PersonDetail, type PersonSummary, type Provider, type SearchResults, type TitleDetail, type TitleSummary } from "./models";
import type { RawCollection, RawDetail, RawPage, RawPerson, RawProvider } from "./raw";
import { buryThin, discoverParams, dropThin, mergeLists, searchTypes, type SearchFilters } from "../search";

export async function search(c: TmdbClient, query: string, language: string): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return { titles: [], people: [] };
  const page = await c.get<RawPage>("/search/multi", { query: q, language, include_adult: false });
  return {
    titles: toSummaries(page.results.filter((r) => r.media_type === "movie" || r.media_type === "tv")),
    people: page.results.filter((r) => r.media_type === "person").map(toPersonSummary),
  };
}

export async function trending(c: TmdbClient, language: string, type: MediaType | "all" = "all"): Promise<TitleSummary[]> {
  const page = await c.get<RawPage>(`/trending/${type}/week`, { language });
  return toSummaries(page.results, type === "all" ? undefined : type);
}

export async function titleDetail(c: TmdbClient, type: MediaType, id: number, language: string, region: string): Promise<TitleDetail> {
  const raw = await c.get<RawDetail>(`/${type}/${id}`, { language, append_to_response: "credits,videos,watch/providers" });
  return toDetail(raw, type, region);
}

/** Details as the deck and the meta loader read them. One URL, so one cache entry serves both. */
export const detailsRaw = (c: TmdbClient, type: MediaType, id: number, language: string) =>
  c.get<RawDetail>(`/${type}/${id}`, { language, append_to_response: "credits,watch/providers" });

export async function deckCard(c: TmdbClient, type: MediaType, id: number, language: string, region: string, only: number[]): Promise<DeckCard> {
  return toDeckCard(await detailsRaw(c, type, id, language), type, region, only);
}

/** Batches detail lookups, at most `limit` in flight. A title that fails is left out, never thrown. */
export function createMetaLoader(c: TmdbClient, language: string, region: string, limit = 8): MetaLoader {
  return async (keys) => {
    const uniq = [...new Set(keys)];
    const settled = await mapLimit(uniq, limit, async (key) => {
      const p = parseTitleKey(key);
      if (!p) throw new Error("bad key");
      return toTitleMeta(await detailsRaw(c, p.type, p.id, language), p.type, region);
    });
    return new Map(settled.flatMap((r) => (r.status === "fulfilled" ? [[r.value.key, r.value] as const] : [])));
  };
}

/**
 * Film series by id, with their parts' runtimes and services from one batched meta lookup.
 * A series that fails to load is missing from the map; a name TMDB has no translation for falls back to English.
 */
export async function collectionSummaries(c: TmdbClient, ids: readonly number[], language: string, meta: MetaLoader, now = new Date()): Promise<Map<number, CollectionSummary>> {
  const uniq = [...new Set(ids)];
  const raws = await mapLimit(uniq, 8, async (id) => {
    const raw = await c.get<RawCollection>(`/collection/${id}`, { language });
    const fallback = (raw.name?.trim() || language.startsWith("en")) ? undefined : (await c.get<RawCollection>(`/collection/${id}`, { language: "en-US" }).catch(() => null))?.name;
    return { raw, fallback };
  });
  const loaded = raws.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const metas = await meta(loaded.flatMap(({ raw }) => (raw.parts ?? []).map((p) => titleKey("movie", p.id))));
  return new Map(loaded.map(({ raw, fallback }) => [raw.id, toCollectionSummary(raw, metas, { now, fallbackName: fallback })]));
}

/** Groups an ordered list into titles and series, loading what grouping needs. Anything that fails stays ungrouped. */
export async function groupList<T extends { key: string; type: MediaType; id: number }>(
  c: TmdbClient, items: readonly T[], language: string, meta: MetaLoader, seriesOf?: (item: T) => SeriesRef | null,
): Promise<ListItem<T>[]> {
  const metas: Map<string, TitleMeta> = seriesOf ? new Map() : await meta(items.filter((i) => i.type === "movie").map((i) => titleKey("movie", i.id)));
  const byId = new Map(items.map((i) => [i.id, i]));
  const lookup = (id: number) => {
    const item = byId.get(id);
    if (seriesOf && item) return seriesOf(item);
    return metas.get(titleKey("movie", id))?.collection ?? null;
  };
  const grouped = groupIntoCollections(items, lookup);
  const ids = grouped.flatMap((g) => (g.kind === "collection" ? [g.series.id] : []));
  const summaries = ids.length ? await collectionSummaries(c, ids, language, meta) : new Map<number, CollectionSummary>();
  return settleGroups(grouped, (id) => summaries.get(id));
}

export async function person(c: TmdbClient, id: number, language: string): Promise<PersonDetail> {
  return toPerson(await c.get<RawPerson>(`/person/${id}`, { language, append_to_response: "combined_credits" }));
}

export async function collection(c: TmdbClient, id: number, language: string): Promise<CollectionDetail> {
  return toCollection(await c.get<RawCollection>(`/collection/${id}`, { language }));
}

export async function searchCollections(c: TmdbClient, query: string, language: string): Promise<{ id: number; name: string; poster: string | null }[]> {
  const page = await c.get<RawPage<RawCollection>>("/search/collection", { query, language });
  return page.results.slice(0, 4).map((r) => { const s = toCollection(r); return { id: s.id, name: s.name, poster: s.poster }; });
}

/** Streaming services available in a region, most prominent first. Movie and TV lists merged. */
export async function providersInRegion(c: TmdbClient, region: string, language: string): Promise<Provider[]> {
  const [movie, tv] = await Promise.all(
    (["movie", "tv"] as const).map((t) => c.get<{ results: RawProvider[] }>(`/watch/providers/${t}`, { watch_region: region, language })),
  );
  const byId = new Map<number, RawProvider>();
  for (const p of [...(movie?.results ?? []), ...(tv?.results ?? [])]) if (!byId.has(p.provider_id)) byId.set(p.provider_id, p);
  const prio = (p: RawProvider) => p.display_priorities?.[region] ?? p.display_priority ?? 999;
  const sorted = [...byId.values()].sort((a, b) => prio(a) - prio(b));
  return toProviders({ flatrate: sorted });
}

export interface Suggestion {
  kind: "title" | "person" | "collection";
  id: number;
  type: MediaType | null;
  label: string;
  year: number | null;
  image: string | null;
  /** Series only: how many released films. */
  count?: number;
}

const thumb = (src: string | null) => (src ? src.replace(/\/w\d+\//, "/w92/") : null);

/** Instant suggestions: up to 8, at most 2 of them people. Parts of one series show as the series. */
export async function suggest(c: TmdbClient, query: string, language: string, meta: MetaLoader): Promise<Suggestion[]> {
  const { titles, people } = await search(c, query, language);
  const ppl = people.filter((p) => p.photo || p.knownFor.length).slice(0, 2);
  const grouped = await groupList(c, dropThin(titles, query).slice(0, 12), language, meta);
  const tts = grouped.slice(0, 8 - ppl.length).map((g): Suggestion => g.kind === "collection"
    ? { kind: "collection", id: g.summary.id, type: null, label: g.summary.name, year: g.summary.yearFrom, image: thumb(g.summary.poster), count: g.summary.partCount }
    : { kind: "title", id: g.item.id, type: g.item.type, label: g.item.title, year: g.item.year, image: thumb(g.item.poster) });
  return [...tts, ...ppl.map((p): Suggestion => ({ kind: "person", id: p.id, type: null, label: p.name, year: null, image: thumb(p.photo) }))];
}

export interface SearchRun { titles: TitleSummary[]; people: PersonSummary[]; more: boolean }

/** Browse mode: TMDB discover, pages 1..f.page, movie and TV interleaved. */
export async function browse(c: TmdbClient, f: SearchFilters, region: string, language: string): Promise<SearchRun> {
  const pages = Array.from({ length: f.page }, (_, i) => i + 1);
  const queries = searchTypes(f).flatMap((type) => pages.map((page) => ({ type, page, params: discoverParams(f, type, region, page) })));
  const live = queries.filter((q) => q.params !== null);
  const res = await Promise.all(live.map((q) => c.get<RawPage>(`/discover/${q.type}`, { ...q.params, language })));
  const titles = pages.flatMap((page) => mergeLists(live.flatMap((q, i) => (q.page === page ? [toSummaries(res[i]?.results, q.type)] : []))));
  const more = res.some((r) => r.page < r.total_pages && r.page === f.page);
  return { titles: mergeLists([titles]), people: [], more };
}

/** Search mode: TMDB search pages 1..f.page. Filters are applied after grouping, so a series is judged by all its parts. */
export async function searchPages(c: TmdbClient, f: SearchFilters, language: string): Promise<SearchRun> {
  const pages = await Promise.all(Array.from({ length: f.page }, (_, i) => c.get<RawPage>("/search/multi", { query: f.q, language, include_adult: false, page: i + 1 })));
  const all = pages.flatMap((p) => p.results);
  const titles = buryThin(mergeLists([toSummaries(all.filter((r) => r.media_type === "movie" || r.media_type === "tv"))]), f.q);
  const people = (pages[0]?.results ?? []).filter((r) => r.media_type === "person").map(toPersonSummary);
  const last = pages[pages.length - 1];
  return { titles, people, more: Boolean(last && last.page < last.total_pages) };
}
