import { seriesName } from "../collections";
import { tmdbImage, yearOf } from "../format";
import { titleKey, type CastMember, type CollectionDetail, type DeckCard, type MediaType, type PersonDetail, type PersonSummary, type Provider, type ProviderKind, type TitleDetail, type TitleSummary } from "./models";
import type { RawDetail, RawListItem, RawPerson, RawProvider, RawRegionProviders, RawCollection } from "./raw";

export function mediaTypeOf(item: RawListItem, fallback?: MediaType): MediaType | null {
  if (item.media_type === "movie" || item.media_type === "tv") return item.media_type;
  if (fallback) return fallback;
  if (item.title !== undefined) return "movie";
  if (item.name !== undefined && item.first_air_date !== undefined) return "tv";
  return null;
}

export function toSummary(item: RawListItem, fallback?: MediaType): TitleSummary | null {
  const type = mediaTypeOf(item, fallback);
  if (!type) return null;
  const title = (type === "movie" ? item.title : item.name) ?? item.title ?? item.name ?? "";
  return {
    key: titleKey(type, item.id),
    id: item.id,
    type,
    title: title.trim() || "Untitled",
    year: yearOf(type === "movie" ? item.release_date : item.first_air_date),
    poster: tmdbImage(item.poster_path, "w500"),
    rating: item.vote_count ? (item.vote_average ?? null) : null,
    overview: item.overview ?? "",
    genreIds: item.genre_ids ?? [],
    ...(item.original_language ? { language: item.original_language } : {}),
  };
}

export function toSummaries(items: RawListItem[] | undefined, fallback?: MediaType): TitleSummary[] {
  const seen = new Set<string>();
  const out: TitleSummary[] = [];
  for (const item of items ?? []) {
    const s = toSummary(item, fallback);
    if (!s || seen.has(s.key)) continue;
    seen.add(s.key);
    out.push(s);
  }
  return out;
}

export function toPersonSummary(item: RawListItem): PersonSummary {
  return {
    id: item.id,
    name: item.name ?? "",
    photo: tmdbImage(item.profile_path, "w185"),
    department: item.known_for_department ?? null,
    knownFor: (item.known_for ?? []).map((k) => k.title ?? k.name ?? "").filter(Boolean).slice(0, 3),
  };
}

const KIND_ORDER: [keyof RawRegionProviders, ProviderKind][] = [["flatrate", "sub"], ["free", "free"], ["ads", "ads"], ["rent", "rent"], ["buy", "buy"]];

/** Flattens a region's providers, best kind first, one entry per provider+kind. */
export function toProviders(region: RawRegionProviders | undefined): Provider[] {
  if (!region) return [];
  const out: Provider[] = [];
  for (const [field, kind] of KIND_ORDER) {
    const list = region[field] as RawProvider[] | undefined;
    for (const p of list ?? []) out.push({ id: p.provider_id, name: p.provider_name, logo: tmdbImage(p.logo_path, "w92"), kind });
  }
  return out;
}

/** Streaming, free or with ads; one entry per service. */
export function streamingOnly(all: Provider[]): Provider[] {
  const subs = all.filter((p) => p.kind === "sub" || p.kind === "free" || p.kind === "ads");
  return subs.filter((p, i) => subs.findIndex((q) => q.id === p.id) === i);
}

export function regionProviders(detail: RawDetail, region: string): RawRegionProviders | undefined {
  return detail["watch/providers"]?.results?.[region.toUpperCase()];
}

export function runtimeOf(d: RawDetail): number | null {
  if (d.runtime) return d.runtime;
  const ep = d.episode_run_time?.find((n) => n > 0);
  return ep ?? null;
}

function castOf(d: RawDetail, limit: number): CastMember[] {
  return (d.credits?.cast ?? []).slice(0, limit).map((c) => ({ id: c.id, name: c.name, role: c.character || null, photo: tmdbImage(c.profile_path, "w185") }));
}

export function toDetail(d: RawDetail, type: MediaType, region: string): TitleDetail {
  const summary = toSummary(d, type) as TitleSummary;
  const trailer = d.videos?.results?.find((v) => v.site === "YouTube" && v.type === "Trailer") ?? null;
  const directors = type === "movie"
    ? (d.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name)
    : (d.created_by ?? []).map((c) => c.name);
  const rp = regionProviders(d, region);
  return {
    ...summary,
    genreIds: (d.genres ?? []).map((g) => g.id),
    backdrop: tmdbImage(d.backdrop_path, "w780"),
    tagline: d.tagline || null,
    runtime: runtimeOf(d),
    genres: d.genres ?? [],
    cast: castOf(d, 12),
    directors,
    trailer: trailer?.key ?? null,
    providers: toProviders(rp),
    providersLink: rp?.link ?? null,
    collection: d.belongs_to_collection ? { id: d.belongs_to_collection.id, name: seriesName(d.belongs_to_collection.name) } : null,
    seasons: d.number_of_seasons ?? null,
  };
}

/** Card for the deck. `only` limits provider logos to the room's services, if any were picked. */
export function toDeckCard(d: RawDetail, type: MediaType, region: string, only: number[] = []): DeckCard {
  const summary = toSummary(d, type) as TitleSummary;
  const unique = streamingOnly(toProviders(regionProviders(d, region)));
  const series = type === "movie" ? d.belongs_to_collection : null;
  return {
    ...(series ? { partOf: { id: series.id, name: seriesName(series.name) } } : {}),
    ...summary,
    genreIds: (d.genres ?? []).map((g) => g.id),
    runtime: runtimeOf(d),
    genreNames: (d.genres ?? []).slice(0, 2).map((g) => g.name),
    providers: only.length ? unique.filter((p) => only.includes(p.id)) : unique.slice(0, 4),
    cast: castOf(d, 5).map((c) => c.name),
  };
}

export function toPerson(p: RawPerson): PersonDetail {
  const cast = (p.combined_credits?.cast ?? []).map((c) => ({ raw: c, role: c.character || null }));
  const crew = (p.combined_credits?.crew ?? []).map((c) => ({ raw: c, role: c.job || null }));
  const seen = new Set<string>();
  const credits: PersonDetail["credits"] = [];
  const all = [...cast, ...crew].sort((a, b) => (b.raw.vote_count ?? 0) - (a.raw.vote_count ?? 0));
  for (const { raw, role } of all) {
    const s = toSummary(raw);
    if (!s || seen.has(s.key)) continue;
    seen.add(s.key);
    credits.push({ ...s, role });
  }
  return {
    id: p.id,
    name: p.name,
    photo: tmdbImage(p.profile_path, "w342"),
    biography: p.biography ?? "",
    birthday: p.birthday ?? null,
    deathday: p.deathday ?? null,
    birthplace: p.place_of_birth ?? null,
    department: p.known_for_department ?? null,
    credits,
  };
}

export function toCollection(c: RawCollection): CollectionDetail {
  const parts = toSummaries(c.parts, "movie").sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
  return { id: c.id, name: seriesName(c.name ?? ""), overview: c.overview ?? "", poster: tmdbImage(c.poster_path, "w500"), backdrop: tmdbImage(c.backdrop_path, "w780"), parts };
}
