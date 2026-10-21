"use client";
import { matchesFromVoters, seriesLookup, seriesParts, type ItemKey, type VoterPicks } from "@wtw/core";
import { useCards } from "./use-cards";

/** A link's results, with yeses and seen-its on a lone film counted for its series (an old link's deck can hold both). */
export function useLinkResults(deck: readonly ItemKey[], voters: readonly VoterPicks[]): ItemKey[] {
  const parts = useCards(seriesParts(deck));
  return matchesFromVoters(deck, voters, seriesLookup(parts));
}
