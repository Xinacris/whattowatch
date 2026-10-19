"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { POLL_MS, type RoomView, type Viewer } from "@wtw/core";
import { api, ApiError, type RoomError } from "./api";

/** Polls the room every ~2s. Serverless, so no sockets; the poll also settles matches server-side. */
export function useRoom(code: string, viewer: Viewer | null) {
  const [view, setView] = useState<RoomView | null>(null);
  const [first, setFirst] = useState<RoomView | null>(null); // what the room looked like when we walked in
  const [fatal, setFatal] = useState<RoomError | null>(null);
  const [offline, setOffline] = useState(false);
  const busy = useRef(false);

  const apply = useCallback((v: RoomView) => { setView(v); setFirst((f) => f ?? v); setOffline(false); }, []);
  const fail = useCallback((err: unknown) => {
    const c = err instanceof ApiError ? err.code : "network";
    if (c === "network" || c === "unknown") setOffline(true);
    else setFatal(c as RoomError);
  }, []);

  useEffect(() => {
    if (!viewer || fatal) return;
    const tick = async () => {
      if (busy.current || document.visibilityState === "hidden") return;
      busy.current = true;
      try { apply(await api.sync(code, viewer)); } catch (e) { fail(e); } finally { busy.current = false; }
    };
    void tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [code, viewer, fatal, apply, fail]);

  return { view, first, fatal, offline, apply, fail };
}
