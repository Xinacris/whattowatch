import { isCard, isLike, type Vote } from "./match";
import type { ItemKey } from "./item-key";
import type { Lang } from "./region";
import { t } from "./strings";

// The round rule, in one place. Web link mode, live rooms and mobile all read these.
export const ROUND_FIRST = 15;
export const ROUND_EXTRA = 5;
export const LIKE_TARGET = 5;
export const MAX_VOTED = 30;

export type RoundPhase = "swiping" | "extend" | "done" | "capped-empty";

export interface RoundState {
  phase: RoundPhase;
  liked: number;
  voted: number; // yes (rewatch included) + no; the legacy "seen it" never counts
  need: number; // always LIKE_TARGET: the tape and the rule read the same number
  size: number; // cards in this round: 15, 20, 25, 30
  /** Why the deck stopped: five yeses, the 30-card cap, or the shelf ran out. */
  reason: "likes" | "cap" | "end" | null;
}

/**
 * Keys that got a yes (rewatch included) or a no, in deck order. This is what the friend swipes. A vote whose card
 * isn't in the list any more (the deck came back regrouped after a reload) still counts, after the rest.
 */
export function votedKeys(deck: readonly ItemKey[], votes: Readonly<Record<string, Vote>>): ItemKey[] {
  const listed = new Set<string>(deck);
  const orphans = Object.keys(votes).filter((k) => !listed.has(k) && isCard(votes[k])) as ItemKey[];
  return [...deck.filter((k) => isCard(votes[k])), ...orphans];
}

/** 15 cards, then 5 more at a time while there are fewer than five yeses, up to 30. */
export const roundSize = (voted: number) => Math.min(MAX_VOTED, voted < ROUND_FIRST ? ROUND_FIRST : ROUND_FIRST + ROUND_EXTRA * (Math.floor((voted - ROUND_FIRST) / ROUND_EXTRA) + 1));

/**
 * Where the initiator is. Derived from votes alone, so undo just works: undoing the fifth yes puts
 * you back in the deck with four. `deckDone` = TMDB has nothing more; then the round is what exists.
 */
export function roundState(votes: Readonly<Record<string, Vote>>, deck: readonly ItemKey[], deckDone = false): RoundState {
  const keys = votedKeys(deck, votes);
  const voted = keys.length;
  const liked = keys.filter((k) => isLike(votes[k])).length;
  const size = roundSize(voted);
  const base = { liked, voted, need: LIKE_TARGET, size };
  if (liked >= LIKE_TARGET) return { ...base, phase: "done", reason: "likes" };
  const outOfCards = deckDone && deck.every((k) => votes[k]);
  if (voted < MAX_VOTED && !outOfCards) {
    return { ...base, phase: voted >= ROUND_FIRST && voted === size - ROUND_EXTRA ? "extend" : "swiping", reason: null };
  }
  const reason = outOfCards && voted < MAX_VOTED ? "end" : "cap";
  return { ...base, phase: liked > 0 ? "done" : "capped-empty", reason };
}

/** A live room member still swiping: their yeses against the same target, and where they are in the shared deck. */
export function roomTape(deck: readonly ItemKey[], votes: Readonly<Record<string, Vote>>) {
  const mine = deck.map((k) => votes[k]);
  const swiped = mine.filter(Boolean).length;
  return { liked: mine.filter(isLike).length, card: Math.min(swiped + 1, deck.length), of: deck.length, grew: deck.length > ROUND_FIRST && swiped === deck.length - ROUND_EXTRA };
}

/** The text on the tape. The target always comes from LIKE_TARGET. */
export function tapeText(lang: Lang, p: { card: number; of: number; liked?: number }): string {
  return p.liked === undefined ? t(lang, "round.counterFriend", { card: p.card, of: p.of }) : t(lang, "round.counter", { liked: p.liked, need: LIKE_TARGET, card: p.card, of: p.of });
}
