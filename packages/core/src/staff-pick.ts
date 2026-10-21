import type { TitleSummary } from "./tmdb/models";

/**
 * The staff pick on the shelf: the best-rated title that enough people have rated, so a 9.8 from
 * twelve votes doesn't win. Ties go to the earlier title (the shelf's own order). -1 = no sticker.
 */
export function staffPick(items: readonly Pick<TitleSummary, "rating" | "votes">[], { minVotes = 300 }: { minVotes?: number } = {}): number {
  let best = -1;
  items.forEach((item, i) => {
    if ((item.votes ?? 0) < minVotes || item.rating === null) return;
    if (best === -1 || item.rating > (items[best]?.rating ?? -Infinity)) best = i;
  });
  return best;
}
