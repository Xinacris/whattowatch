import { isCollectionKey, type CollectionKey, type ItemKey } from "./item-key";
import { voterKey } from "./link-voter";
import { isLike, type Vote } from "./match";

/**
 * One voter's answers as key lists. `likes` = every yes, rewatches included; `rewatch` = the yeses
 * that were "seen it, again" (missing on picks from before v2.7); `seen` = the legacy skip.
 */
export interface VoterPicks { likes: readonly ItemKey[]; seen: readonly ItemKey[]; rewatch?: readonly ItemKey[] }

/** A shared title, and which voters (indices into the voter list) have already seen it. */
export interface SharedResult { key: ItemKey; seenBy: number[] }

/** A ballot as picks, in deck order. The one place a vote becomes a like. */
export function picksFrom(deck: readonly ItemKey[], votes: Readonly<Record<string, Vote>>): { likes: ItemKey[]; seen: ItemKey[]; rewatch: ItemKey[] } {
  return { likes: deck.filter((k) => isLike(votes[k])), seen: deck.filter((k) => votes[k] === "seen"), rewatch: deck.filter((k) => votes[k] === "rewatch") };
}

/**
 * What everyone said yes to, in deck order, with who has seen each. Needs two voters: one person
 * agreeing with themselves isn't a result. A legacy "seen it" takes a title out; a rewatch is a yes.
 * `seriesOf` maps a lone part to its series: a yes on Shrek 2 counts as a yes on the Shrek series
 * card when the deck has one, and a "seen it" on Shrek 2 takes the series out (an older link voted
 * part by part, a newer one by series).
 */
export function sharedResults(deck: readonly ItemKey[], voters: readonly VoterPicks[], seriesOf?: (key: ItemKey) => CollectionKey | null): SharedResult[] {
  if (voters.length < 2) return [];
  const inDeck = new Set<string>(deck);
  const lift = (k: ItemKey): ItemKey => { const c = seriesOf?.(k); return c && inDeck.has(c) ? c : k; };
  const set = (keys: readonly ItemKey[] = []) => new Set<string>([...keys, ...keys.map(lift)]);
  const sets = voters.map((v) => ({ likes: set(v.likes), seen: set(v.seen), rewatch: set(v.rewatch) }));
  return [...new Set(deck)]
    .filter((k) => sets.every((s) => s.likes.has(k) && !s.seen.has(k)))
    .map((key) => ({ key, seenBy: sets.flatMap((s, i) => (s.rewatch.has(key) ? [i] : [])) }));
}

/** Just the shared keys. */
export function matchesFromVoters(deck: readonly ItemKey[], voters: readonly VoterPicks[], seriesOf?: (key: ItemKey) => CollectionKey | null): ItemKey[] {
  return sharedResults(deck, voters, seriesOf).map((r) => r.key);
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
