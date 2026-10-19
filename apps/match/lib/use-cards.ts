"use client";
import { useEffect, useState } from "react";
import { detailToDeckCard, parseTitleKey, type DeckCard, type TitleDetail, type TitleKey } from "@wtw/core";
import { usePrefs } from "@wtw/ui";
import { useDeck } from "./deck-store";

/** Cards for these keys: from the loaded deck when we have them, fetched when we don't. */
export function useCards(keys: readonly TitleKey[]): DeckCard[] {
  const deckCards = useDeck((s) => s.cards);
  const { lang, region } = usePrefs();
  const [fetched, setFetched] = useState<Record<string, DeckCard>>({});
  const missing = keys.filter((k) => !deckCards.some((c) => c.key === k) && !fetched[k]);
  const missingKey = missing.join(",");

  useEffect(() => {
    if (!missingKey) return;
    let live = true;
    for (const key of missingKey.split(",")) {
      const p = parseTitleKey(key);
      if (!p) continue;
      fetch(`/match/api/tmdb/title/${p.type}/${p.id}?lang=${lang}&region=${region}`)
        .then((r) => (r.ok ? (r.json() as Promise<TitleDetail>) : null))
        .then((d) => { if (live && d) setFetched((f) => ({ ...f, [key]: detailToDeckCard(d) })); })
        .catch(() => {});
    }
    return () => { live = false; };
  }, [missingKey, lang, region]);

  return keys.map((k) => deckCards.find((c) => c.key === k) ?? fetched[k]).filter((c): c is DeckCard => Boolean(c));
}
