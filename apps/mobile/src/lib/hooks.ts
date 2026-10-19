import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { ApiError, detailToDeckCard, POLL_MS, type DeckCard, type RoomError, type RoomView, type TitleKey, type Viewer } from "@wtw/core";
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

/** Cards for keys: from the loaded deck, else fetched from the API. */
export function useCards(keys: readonly TitleKey[]): DeckCard[] {
  const { cards } = useDeck();
  const { lang, region } = usePrefs();
  const [fetched, setFetched] = useState<Record<string, DeckCard>>({});
  const missing = keys.filter((k) => !cards.some((c) => c.key === k) && !fetched[k]).join(",");
  useEffect(() => {
    if (!missing) return;
    for (const k of missing.split(",") as TitleKey[]) {
      api.title(k, lang, region).then((d) => setFetched((f) => ({ ...f, [k]: detailToDeckCard(d) })), () => {});
    }
  }, [missing, lang, region]);
  return keys.map((k) => cards.find((c) => c.key === k) ?? fetched[k]).filter((c): c is DeckCard => Boolean(c));
}
