import "server-only";
import { buildDeckPage, type DealPage } from "@wtw/core";
import { tmdb } from "@wtw/ui/server";

/** Live rooms deal from the same seeded discover pages link mode uses; only the keys are stored. */
export const deal: DealPage = async (filters, seed, page) => {
  const p = await buildDeckPage(tmdb(), filters, seed, page, "en-US");
  return { keys: p.cards.map((c) => c.key), done: p.done };
};
