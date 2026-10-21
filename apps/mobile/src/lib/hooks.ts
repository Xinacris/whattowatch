import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { ApiError, DEFAULT_FILTERS, matchesFromVoters, POLL_MS, seriesLookup, seriesParts, type DeckCard, type ItemKey, type RoomError, type RoomView, type Viewer, type VoterPicks } from "@wtw/core";
import { api } from "./api";
import { useDeck } from "./deck";
import { usePrefs } from "./prefs";
import { getViewer } from "./viewer";

export function useViewer() {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  useEffect(() => { void getViewer().then(setViewer); }, []);
  return [viewer, setViewer] as const;
}

/** Polls the room every ~2s while the app is in the foreground. */
export function useRoom(code: string, viewer: Viewer | null) {
  const [view, setView] = useState<RoomView | null>(null);
  const [first, setFirst] = useState<RoomView | null>(null);
  const [fatal, setFatal] = useState<RoomError | null>(null);
  const [offline, setOffline] = useState(false);
  const busy = useRef(false);
  const apply = useCallback((v: RoomView) => { setView(v); setFirst((f) => f ?? v); setOffline(false); }, []);
  const fail = useCallback((e: unknown) => {
    const c = e instanceof ApiError ? e.code : "network";
    if (c === "network" || c === "unknown") setOffline(true); else setFatal(c as RoomError);
  }, []);
  useEffect(() => {
    if (!viewer?.name || fatal) return;
    const tick = async () => {
      if (busy.current || AppState.currentState !== "active") return;
      busy.current = true;
      try { apply(await api.sync(code, viewer)); } catch (e) { fail(e); } finally { busy.current = false; }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [code, viewer, fatal, apply, fail]);
  return { view, first, fatal, offline, apply, fail };
}

/** Cards for keys (titles or series): from the loaded deck, else fetched from the API in one go. */
export function useCards(keys: readonly ItemKey[]): DeckCard[] {
  const { cards, filters } = useDeck();
  const { lang, region } = usePrefs();
  const [fetched, setFetched] = useState<Record<string, DeckCard>>({});
  const missing = keys.filter((k) => !cards.some((c) => c.key === k) && !fetched[k]).join(".");
  useEffect(() => {
    if (!missing) return;
    const f = { ...(filters ?? DEFAULT_FILTERS), region, providers: [] };
    api.cards(missing.split(".") as ItemKey[], f, lang).then((got) => setFetched((prev) => ({ ...prev, ...Object.fromEntries(got.map((c) => [c.key, c])) })), () => {});
  }, [missing, lang, region, filters]);
  return keys.map((k) => cards.find((c) => c.key === k) ?? fetched[k]).filter((c): c is DeckCard => Boolean(c));
}

/** A link's results, with yeses and seen-its on a lone film counted for its series. Same core rule as the web. */
export function useLinkResults(deck: readonly ItemKey[], voters: readonly VoterPicks[]): ItemKey[] {
  const parts = useCards(seriesParts(deck));
  return matchesFromVoters(deck, voters, seriesLookup(parts));
}
