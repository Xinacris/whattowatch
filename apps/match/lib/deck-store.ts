"use client";
import { useSyncExternalStore } from "react";
import { createDeckSession, type DeckState } from "@wtw/core";
import { api } from "./api";

export { remaining } from "@wtw/core";

const session = createDeckSession(api.deck, api.cards);

type Hook = {
  (): DeckState & typeof session;
  <T>(select: (s: DeckState) => T): T;
  getState(): DeckState & typeof session;
};

/** The shared core deck session, as a React hook. */
export const useDeck = ((select?: (s: DeckState) => unknown) => {
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  return select ? select(state) : { ...state, ...session };
}) as Hook;
useDeck.getState = () => ({ ...session.getState(), ...session });
