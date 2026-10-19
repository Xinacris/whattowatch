import type { TmdbClient } from "./client";
import { toCollection, toDetail, toPerson, toPersonSummary, toSummaries, toProviders, toDeckCard } from "./mappers";
import type { CollectionDetail, DeckCard, MediaType, PersonDetail, Provider, SearchResults, TitleDetail, TitleSummary } from "./models";
import type { RawCollection, RawDetail, RawPage, RawPerson, RawProvider } from "./raw";

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
