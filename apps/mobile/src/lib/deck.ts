import { useSyncExternalStore } from "react";
import { createDeckSession, type DeckState } from "@wtw/core";
import { api } from "./api";

export const deck = createDeckSession(api.deck, api.cards);

/** The shared core deck session as a hook; same store logic as the web. */
export function useDeck(): DeckState {
  return useSyncExternalStore(deck.subscribe, deck.getState, deck.getState);
}
