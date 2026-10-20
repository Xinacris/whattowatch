import { regionProviders, runtimeOf, streamingOnly, toProviders } from "./tmdb/mappers";
import { titleKey, type MediaType, type Provider, type TitleKey } from "./tmdb/models";
import type { RawDetail } from "./tmdb/raw";

// The few facts per title that grouping and filtering need, read from one cached details call.
// The loader (cache, concurrency, retries) lives in @wtw/ui/server; this is only the shape.

export interface TitleMeta {
  key: TitleKey;
  runtime: number | null;
  collection: { id: number; name: string } | null;
  /** Streaming, free or with ads, in the loader's region. One entry per service. */
  providers: Provider[];
  releaseDate: string | null;
}

/** Looks up many titles at once. Titles that failed to load are simply missing from the map. */
export type MetaLoader = (keys: readonly TitleKey[]) => Promise<Map<TitleKey, TitleMeta>>;

export function toTitleMeta(d: RawDetail, type: MediaType, region: string): TitleMeta {
  return {
    key: titleKey(type, d.id),
    runtime: runtimeOf(d),
    collection: type === "movie" && d.belongs_to_collection ? { id: d.belongs_to_collection.id, name: d.belongs_to_collection.name } : null,
    providers: streamingOnly(toProviders(regionProviders(d, region))),
    releaseDate: (type === "movie" ? d.release_date : d.first_air_date) || null,
  };
}

/** Runs `fn` over `items`, at most `limit` at a time, results in input order. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try { out[i] = { status: "fulfilled", value: await fn(items[i] as T) }; } catch (reason) { out[i] = { status: "rejected", reason }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
