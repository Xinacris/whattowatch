import type { ItemKey } from "./item-key";

/**
 * → like, ← nope, ↑ rewatch ("seen it, and I'd watch it again"). `seen` is the ↑ from before v2.7,
 * when it meant "seen it, skip": nothing sends it any more, but rooms in Redis and links in people's
 * chats still hold it, and it keeps meaning a skip there.
 */
export type Vote = "like" | "nope" | "rewatch" | "seen";
export type Ballot = Record<string, Vote>; // titleKey -> vote

/** What each answer means to the rules. `card` = a yes or a no: a card the friend swipes and the counter counts. */
const MEANING: Readonly<Record<Vote, { like: boolean; card: boolean }>> = {
  like: { like: true, card: true },
  rewatch: { like: true, card: true },
  nope: { like: false, card: true },
  seen: { like: false, card: false },
};

const meaning = (v: unknown) => (typeof v === "string" && Object.hasOwn(MEANING, v) ? MEANING[v as Vote] : null);

/** A yes, of either kind. Every rule that counts yeses asks this. Anything unknown (old or tampered data) is a no. */
export const isLike = (v: unknown): boolean => meaning(v)?.like ?? false;

/** A yes or a no. The legacy skip isn't a card anyone answered. */
export const isCard = (v: unknown): boolean => meaning(v)?.card ?? false;

export interface MatchRecord { key: ItemKey; at: number }

/**
 * The match rule: liked by every current member (a rewatch is a like). A legacy "seen it" means it can't match.
 * A room of one never matches; a match needs at least two people agreeing.
 */
export function isMatch(key: ItemKey, memberIds: readonly string[], ballots: Readonly<Record<string, Ballot>>): boolean {
  if (memberIds.length < 2) return false;
  return memberIds.every((id) => isLike(ballots[id]?.[key]));
}

/** Every title currently matching, regardless of whether it was recorded yet. */
export function currentMatches(memberIds: readonly string[], ballots: Readonly<Record<string, Ballot>>): ItemKey[] {
  const first = memberIds[0];
  if (!first || memberIds.length < 2) return [];
  const candidates = Object.entries(ballots[first] ?? {}).filter(([, v]) => isLike(v)).map(([k]) => k as ItemKey);
  return candidates.filter((k) => isMatch(k, memberIds, ballots));
}

/** Records new matches once. Existing records keep their original time, so ranking is stable. */
export function recordMatches(existing: readonly MatchRecord[], found: readonly ItemKey[], now: number): MatchRecord[] {
  const have = new Set(existing.map((m) => m.key));
  const added = found.filter((k) => !have.has(k)).map((key) => ({ key, at: now }));
  return [...existing, ...added];
}

/** Shortlist order: first agreed on, first listed. */
export function shortlist(matches: readonly MatchRecord[]): ItemKey[] {
  return [...matches].sort((a, b) => a.at - b.at || a.key.localeCompare(b.key)).map((m) => m.key);
}
