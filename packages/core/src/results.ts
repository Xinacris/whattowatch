import type { TitleKey } from "./tmdb/models";

export interface VoterPicks { likes: readonly TitleKey[]; seen: readonly TitleKey[] }

/**
 * What everyone said yes to, in deck order. Needs two voters: one person agreeing with
 * themselves isn't a result. Anyone's "seen it" takes a title out.
 */
export function matchesFromVoters(deck: readonly TitleKey[], voters: readonly VoterPicks[]): TitleKey[] {
  if (voters.length < 2) return [];
  const sets = voters.map((v) => ({ likes: new Set(v.likes), seen: new Set(v.seen) }));
  return [...new Set(deck)].filter((k) => sets.every((s) => s.likes.has(k) && !s.seen.has(k)));
}

/** Display names for voters, with duplicates told apart: "Ali", "Ali (2)". */
export function voterLabels(names: readonly string[]): string[] {
  const count = new Map<string, number>();
  return names.map((raw) => {
    const name = raw.trim() || "?";
    const k = name.toLocaleLowerCase();
    const n = (count.get(k) ?? 0) + 1;
    count.set(k, n);
    return n === 1 ? name : `${name} (${n})`;
  });
}
