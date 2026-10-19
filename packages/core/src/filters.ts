import { GENRES, MAX_GENRES } from "./genres";
import type { MediaType } from "./tmdb/models";

export type Kind = "movie" | "tv" | "both";
export type Era = "new" | "classic" | "any";

export interface RoomFilters {
  kind: Kind;
  providers: number[]; // empty = whatever's on anywhere
  genres: string[]; // slugs, max 3, empty = anything
  maxRuntime: number | null; // minutes; for TV this is per episode
  era: Era;
  region: string; // ISO 3166-1, e.g. "TR"
}

export const DEFAULT_FILTERS: RoomFilters = { kind: "movie", providers: [], genres: [], maxRuntime: null, era: "any", region: "US" };

/** Clamps anything coming off a URL or a request body into a valid filter set. */
export function sanitizeFilters(input: Partial<RoomFilters> | null | undefined): RoomFilters {
  const f = input ?? {};
  const kind: Kind = f.kind === "tv" || f.kind === "both" ? f.kind : "movie";
  const era: Era = f.era === "new" || f.era === "classic" ? f.era : "any";
  const providers = [...new Set((f.providers ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 30);
  const genres = [...new Set((f.genres ?? []).filter((s) => GENRES.some((g) => g.slug === s)))].slice(0, MAX_GENRES);
  const rt = Number(f.maxRuntime);
  const maxRuntime = Number.isFinite(rt) && rt >= 20 ? Math.min(Math.round(rt), 400) : null;
  const region = typeof f.region === "string" && /^[A-Za-z]{2}$/.test(f.region) ? f.region.toUpperCase() : "US";
  return { kind, providers, genres, maxRuntime, era, region };
}

export function kindsOf(kind: Kind): MediaType[] {
  return kind === "both" ? ["movie", "tv"] : [kind];
}

/** Query-string form for the deck API. Stable key order so CDN caching works. */
export function filtersToQuery(f: RoomFilters): Record<string, string> {
  const q: Record<string, string> = { kind: f.kind, era: f.era, region: f.region };
  if (f.providers.length) q.providers = [...f.providers].sort((a, b) => a - b).join(".");
  if (f.genres.length) q.genres = f.genres.join(".");
  if (f.maxRuntime) q.maxRuntime = String(f.maxRuntime);
  return q;
}

export function filtersFromQuery(q: { get(name: string): string | null }): RoomFilters {
  const list = (name: string) => q.get(name)?.split(".").filter(Boolean) ?? [];
  return sanitizeFilters({
    kind: q.get("kind") as Kind,
    era: q.get("era") as Era,
    region: q.get("region") ?? undefined,
    providers: list("providers").map(Number),
    genres: list("genres"),
    maxRuntime: q.get("maxRuntime") ? Number(q.get("maxRuntime")) : null,
  });
}
