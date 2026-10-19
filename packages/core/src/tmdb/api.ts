import type { TmdbClient } from "./client";
import { toCollection, toDetail, toPerson, toPersonSummary, toSummaries, toProviders, toDeckCard } from "./mappers";
import type { CollectionDetail, DeckCard, MediaType, PersonDetail, PersonSummary, Provider, SearchResults, TitleDetail, TitleSummary } from "./models";
import type { RawCollection, RawDetail, RawPage, RawPerson, RawProvider } from "./raw";
import { discoverParams, mergeLists, searchTypes, summaryPasses, type SearchFilters } from "../search";

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

export async function deckCard(c: TmdbClient, type: MediaType, id: number, language: string, region: string, only: number[]): Promise<DeckCard> {
  const raw = await c.get<RawDetail>(`/${type}/${id}`, { language, append_to_response: "credits,watch/providers" });
  return toDeckCard(raw, type, region, only);
}

export async function person(c: TmdbClient, id: number, language: string): Promise<PersonDetail> {
  return toPerson(await c.get<RawPerson>(`/person/${id}`, { language, append_to_response: "combined_credits" }));
}

export async function collection(c: TmdbClient, id: number, language: string): Promise<CollectionDetail> {
  return toCollection(await c.get<RawCollection>(`/collection/${id}`, { language }));
}

export async function searchCollections(c: TmdbClient, query: string, language: string): Promise<{ id: number; name: string; poster: string | null }[]> {
  const page = await c.get<RawPage<RawCollection>>("/search/collection", { query, language });
  return page.results.slice(0, 4).map((r) => ({ id: r.id, name: r.name, poster: toCollection(r).poster }));
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

export interface Suggestion { kind: "title" | "person"; id: number; type: MediaType | null; label: string; year: number | null; image: string | null }

/** Instant suggestions: up to 8, at most 2 of them people. */
export async function suggest(c: TmdbClient, query: string, language: string): Promise<Suggestion[]> {
  const { titles, people } = await search(c, query, language);
  const ppl = people.filter((p) => p.photo || p.knownFor.length).slice(0, 2);
  const tts = titles.slice(0, 8 - ppl.length);
  return [
    ...tts.map((s) => ({ kind: "title" as const, id: s.id, type: s.type, label: s.title, year: s.year, image: s.poster ? s.poster.replace("/w500/", "/w92/") : null })),
    ...ppl.map((p) => ({ kind: "person" as const, id: p.id, type: null, label: p.name, year: null, image: p.photo ? p.photo.replace("/w185/", "/w92/") : null })),
  ];
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

/** Search mode: TMDB search pages 1..f.page, then the filters TMDB search can't apply. */
export async function searchPages(c: TmdbClient, f: SearchFilters, language: string): Promise<SearchRun> {
  const pages = await Promise.all(Array.from({ length: f.page }, (_, i) => c.get<RawPage>("/search/multi", { query: f.q, language, include_adult: false, page: i + 1 })));
  const all = pages.flatMap((p) => p.results);
  const titles = mergeLists([toSummaries(all.filter((r) => r.media_type === "movie" || r.media_type === "tv"))]).filter((s) => summaryPasses(s, f));
  const people = (pages[0]?.results ?? []).filter((r) => r.media_type === "person").map(toPersonSummary);
  const last = pages[pages.length - 1];
  return { titles, people, more: Boolean(last && last.page < last.total_pages) };
}
