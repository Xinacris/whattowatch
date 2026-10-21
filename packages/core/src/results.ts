import { isCollectionKey, type CollectionKey, type ItemKey } from "./item-key";
import { voterKey } from "./link-voter";

export interface VoterPicks { likes: readonly ItemKey[]; seen: readonly ItemKey[] }

/**
 * What everyone said yes to, in deck order. Needs two voters: one person agreeing with
 * themselves isn't a result. Anyone's "seen it" takes a title out.
 * `seriesOf` maps a lone part to its series: a yes on Shrek 2 counts as a yes on the Shrek series
 * card when the deck has one, and a "seen it" on Shrek 2 takes the series out (an older link voted
 * part by part, a newer one by series).
 */
export function matchesFromVoters(deck: readonly ItemKey[], voters: readonly VoterPicks[], seriesOf?: (key: ItemKey) => CollectionKey | null): ItemKey[] {
  if (voters.length < 2) return [];
  const inDeck = new Set<string>(deck);
  const lift = (k: ItemKey): ItemKey => { const c = seriesOf?.(k); return c && inDeck.has(c) ? c : k; };
  const sets = voters.map((v) => ({ likes: new Set<string>([...v.likes, ...v.likes.map(lift)]), seen: new Set<string>([...v.seen, ...v.seen.map(lift)]) }));
  return [...new Set(deck)].filter((k) => sets.every((s) => s.likes.has(k) && !s.seen.has(k)));
}

/** Deck cards whose series we need to know (from their loaded cards) before `seriesOf` can lift them: movies, and only when the deck also holds a series card. */
export function seriesParts(deck: readonly ItemKey[]): ItemKey[] {
  return deck.some(isCollectionKey) ? deck.filter((k) => k.startsWith("m")) : [];
}

/** Display names for voters, with duplicates told apart: "Ali", "Ali (2)". */
export function voterLabels(names: readonly string[]): string[] {
  const count = new Map<string, number>();
  return names.map((raw) => {
    const name = raw.trim() || "?";
    const k = voterKey(name);
    const n = (count.get(k) ?? 0) + 1;
    count.set(k, n);
    return n === 1 ? name : `${name} (${n})`;
  });
}
