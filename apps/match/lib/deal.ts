import "server-only";
import { buildDeckPage, seriesOfCard, type DealPage } from "@wtw/core";
import { metaLoader, tmdb } from "@wtw/ui/server";

/** Live rooms deal from the same seeded, series-grouped discover pages link mode uses; only keys (and their series) are stored. */
export const deal: DealPage = async (filters, seed, page) => {
  const p = await buildDeckPage(tmdb(), filters, seed, page, "en-US", metaLoader("en-US", filters.region));
  const series: Record<string, number> = {};
  for (const c of p.cards) { const s = seriesOfCard(c); if (s !== null) series[c.key] = s; }
  return { keys: p.cards.map((c) => c.key), done: p.done, series };
};
