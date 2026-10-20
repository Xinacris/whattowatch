import "server-only";
import { cache } from "react";
import { createMetaLoader, titleKey, type MetaLoader, type TitleMeta } from "@wtw/core";
import { tmdb } from "./tmdb";

/**
 * The one loader for per-title facts (series, runtime, services). Lookups run 8 at a time through
 * the TMDB client, which retries 429s with backoff; the details call behind it is the same URL the
 * deck uses, cached for 7 days (see tmdb.ts), so search filters and series grouping share one fetch.
 */
export const metaLoader = cache((language: string, region: string): MetaLoader => createMetaLoader(tmdb(), language, region, 8));

export async function movieMeta(id: number, language: string, region: string): Promise<TitleMeta | null> {
  const key = titleKey("movie", id);
  return (await metaLoader(language, region)([key])).get(key) ?? null;
}
