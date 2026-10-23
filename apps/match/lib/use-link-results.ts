"use client";
import { seriesLookup, seriesParts, sharedResults, type ItemKey, type SharedResult, type VoterPicks } from "@wtw/core";
import { useCards } from "./use-cards";

/** A link's results with who has seen each; yeses, rewatches and old seen-its on a lone film count for its series (an old link's deck can hold both). */
export function useLinkResults(deck: readonly ItemKey[], voters: readonly VoterPicks[]): SharedResult[] {
  const parts = useCards(seriesParts(deck));
  return sharedResults(deck, voters, seriesLookup(parts));
}
