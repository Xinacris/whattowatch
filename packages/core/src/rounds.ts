import type { Vote } from "./match";
import type { TitleKey } from "./tmdb/models";

// The round rule, in one place. Web link mode, live rooms and mobile all read these.
export const ROUND_FIRST = 10;
export const ROUND_EXTRA = 5;
export const LIKE_RATIO = 0.3;
export const MAX_VOTED = 30;

export type RoundPhase = "swiping" | "extend" | "done" | "capped-empty";

export interface RoundState {
  phase: RoundPhase;
  liked: number;
  voted: number; // yes + no; "seen it" never counts
  target: number; // votes this round ends at: 10, 15, ... 30
  need: number; // likes needed when this round ends
  nextSize: number; // votes left in this round
  /** Why the deck stopped: ratio hit, 30-card cap, or the shelf ran out. */
  reason: "ratio" | "cap" | "end" | null;
}

/** ceil(0.3 × voted), without 0.1 + 0.2 surprises. */
export const likesNeeded = (voted: number) => Math.ceil(voted * LIKE_RATIO - 1e-9);

export const meetsRatio = (liked: number, voted: number) => voted > 0 && liked >= likesNeeded(voted);

/** Ordered keys that got a yes or a no. This is what the friend swipes. */
export function votedKeys(deck: readonly TitleKey[], votes: Readonly<Record<string, Vote>>): TitleKey[] {
  return deck.filter((k) => votes[k] === "like" || votes[k] === "nope");
}

/** Votes land in deck order (you always swipe the top card), so likes at a checkpoint are a prefix count. */
function targetFor(likedAt: (n: number) => number, voted: number): number {
  let target = ROUND_FIRST;
  while (voted >= target && !meetsRatio(likedAt(target), target) && target < MAX_VOTED) target += ROUND_EXTRA;
  return target;
}

/**
 * Where the initiator is. Derived from votes alone, so undo just works: undoing the 10th vote
 * puts you back in round one. `deckDone` = TMDB has nothing more; then the round is what exists.
 */
export function roundState(votes: Readonly<Record<string, Vote>>, deck: readonly TitleKey[], deckDone = false): RoundState {
  const keys = votedKeys(deck, votes);
  const voted = keys.length;
  const likedAt = (n: number) => keys.slice(0, n).filter((k) => votes[k] === "like").length;
  const liked = likedAt(voted);
  const target = targetFor(likedAt, voted);
  const unvoted = deck.filter((k) => !votes[k]).length;
  const outOfCards = deckDone && unvoted === 0 && voted < target;
  const end = outOfCards ? voted : target;
  const base = { liked, voted, target, need: likesNeeded(end), nextSize: Math.max(0, target - voted) };
  if (voted < end) return { ...base, phase: target > ROUND_FIRST && voted === target - ROUND_EXTRA ? "extend" : "swiping", reason: null };
  if (meetsRatio(likedAt(end), end)) return { ...base, phase: "done", reason: outOfCards ? "end" : "ratio" };
  const reason = outOfCards ? "end" : "cap";
  return { ...base, phase: liked > 0 ? "done" : "capped-empty", reason };
}
