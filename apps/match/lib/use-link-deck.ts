"use client";
import { useEffect } from "react";
import { v1DeckSize, type LinkPayload, type StartOptions } from "@wtw/core";
import { usePrefs } from "@wtw/ui";
import { useDeck } from "./deck-store";
import { loadProgress, saveProgress } from "./link-progress";

/** Starts the deck for this link and keeps this person's swipes in sessionStorage. Friends get the link's fixed deck. */
export function useLinkDeck(payload: LinkPayload, role: "initiator" | "friend", name: string) {
  const { lang } = usePrefs();
  const votes = useDeck((s) => s.votes);
  useEffect(() => {
    const opts: StartOptions = role === "initiator" ? {} : payload.version !== 1 ? { keys: payload.deck } : { limit: v1DeckSize(payload) };
    useDeck.getState().start(payload.filters, payload.seed, lang, loadProgress(payload.seed, name), opts);
  }, [payload, role, lang, name]);
  useEffect(() => { if (Object.keys(votes).length) saveProgress(payload.seed, name, votes); }, [votes, payload.seed, name]);
}
