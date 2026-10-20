"use client";
import { useEffect, useState } from "react";
import { DEFAULT_FILTERS, type DeckCard, type ItemKey, type RoomFilters } from "@wtw/core";
import { usePrefs } from "@wtw/ui";
import { api } from "./api";
import { useDeck } from "./deck-store";

/** Cards for these keys (titles or series): from the loaded deck when we have them, fetched in one go when we don't. */
export function useCards(keys: readonly ItemKey[]): DeckCard[] {
  const deckCards = useDeck((s) => s.cards);
  const filters = useDeck((s) => s.filters);
  const { lang, region } = usePrefs();
  const [fetched, setFetched] = useState<Record<string, DeckCard>>({});
  const missing = keys.filter((k) => !deckCards.some((c) => c.key === k) && !fetched[k]);
  const missingKey = missing.join(".");

  useEffect(() => {
    if (!missingKey) return;
    let live = true;
    const f: RoomFilters = { ...(filters ?? DEFAULT_FILTERS), region, providers: [] };
    api.cards(missingKey.split(".") as ItemKey[], f, lang)
      .then((cards) => { if (live) setFetched((prev) => ({ ...prev, ...Object.fromEntries(cards.map((c) => [c.key, c])) })); })
      .catch(() => {});
    return () => { live = false; };
  }, [missingKey, lang, region, filters]);

  return keys.map((k) => deckCards.find((c) => c.key === k) ?? fetched[k]).filter((c): c is DeckCard => Boolean(c));
}
