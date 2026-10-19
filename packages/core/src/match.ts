import type { TitleKey } from "./tmdb/models";

export type Vote = "like" | "nope" | "seen";
export type Ballot = Record<string, Vote>; // titleKey -> vote

export interface MatchRecord { key: TitleKey; at: number }

/**
 * The match rule: liked by every current member. Someone marking it seen means it can't match.
 * A room of one never matches; a match needs at least two people agreeing.
 */
export function isMatch(key: TitleKey, memberIds: readonly string[], ballots: Readonly<Record<string, Ballot>>): boolean {
  if (memberIds.length < 2) return false;
  // "Seen it" isn't a like, so a current member who has seen it already fails this check.
  return memberIds.every((id) => ballots[id]?.[key] === "like");
}

/** Every title currently matching, regardless of whether it was recorded yet. */
export function currentMatches(memberIds: readonly string[], ballots: Readonly<Record<string, Ballot>>): TitleKey[] {
  const first = memberIds[0];
  if (!first || memberIds.length < 2) return [];
  const candidates = Object.entries(ballots[first] ?? {}).filter(([, v]) => v === "like").map(([k]) => k as TitleKey);
  return candidates.filter((k) => isMatch(k, memberIds, ballots));
}

/** Records new matches once. Existing records keep their original time, so ranking is stable. */
export function recordMatches(existing: readonly MatchRecord[], found: readonly TitleKey[], now: number): MatchRecord[] {
  const have = new Set(existing.map((m) => m.key));
  const added = found.filter((k) => !have.has(k)).map((key) => ({ key, at: now }));
  return [...existing, ...added];
}

/** Shortlist order: first agreed on, first listed. */
export function shortlist(matches: readonly MatchRecord[]): TitleKey[] {
  return [...matches].sort((a, b) => a.at - b.at || a.key.localeCompare(b.key)).map((m) => m.key);
}
