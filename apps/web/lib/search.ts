import "server-only";
import { browse, deckCard, isSearchMode, searchPages, type Provider, type SearchFilters, type SearchRun, type TitleSummary } from "@wtw/core";
import { tmdb } from "@wtw/ui/server";

/** Logos for the first batch come with the page; the rest load from the client. */
export const LOGOS_UP_FRONT = 20;

type Extras = Map<string, { providers: Provider[]; runtime: number | null }>;

async function extrasFor(titles: TitleSummary[], region: string, language: string, only: number[]): Promise<Extras> {
  const settled = await Promise.allSettled(titles.map((s) => deckCard(tmdb(), s.type, s.id, language, region, only)));
  return new Map(settled.flatMap((r) => (r.status === "fulfilled" ? [[r.value.key, { providers: r.value.providers, runtime: r.value.runtime }] as const] : [])));
}

/**
 * Browse = TMDB discover, which applies every filter itself. Search = TMDB search, then our filters;
 * runtime and services need each title's details, fetched with the same long cache as deck cards.
 */
export async function runSearch(f: SearchFilters, region: string, language: string, saved: number[]) {
  const only = Array.isArray(f.services) ? f.services : [];
  const searching = isSearchMode(f);
  const run: SearchRun = searching ? await searchPages(tmdb(), f, language) : await browse(tmdb(), f, region, language);
  const needAll = searching && (f.runtimeMax !== null || f.services !== null);
  const extras = await extrasFor(needAll ? run.titles : run.titles.slice(0, LOGOS_UP_FRONT), region, language, only.length ? only : saved);
  const keep = (s: TitleSummary) => {
    if (!needAll) return true;
    const x = extras.get(s.key);
    if (!x) return false;
    if (f.runtimeMax && (!x.runtime || x.runtime > f.runtimeMax)) return false;
    return f.services === null || x.providers.length > 0;
  };
  const items = run.titles.filter(keep).map((s) => ({ ...s, logos: extras.get(s.key)?.providers ?? null }));
  return { ...run, items };
}
