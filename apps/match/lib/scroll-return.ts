"use client";
import { useEffect } from "react";

const key = () => `wtw:scroll:${window.location.pathname}${window.location.search}`;

/** Call before leaving the page from a result, so coming back lands on the same spot. */
export function rememberScroll() {
  try { sessionStorage.setItem(key(), String(Math.round(window.scrollY))); } catch { /* private mode: no restore */ }
}

/**
 * Back on the page: once `ready` (the results are drawn, so the page is tall enough), scroll to
 * where we left. The browser's own restore runs before the polled results exist, so it lands on top.
 */
export function useScrollReturn(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let y: string | null = null;
    try { y = sessionStorage.getItem(key()); sessionStorage.removeItem(key()); } catch { /* private mode: no restore */ }
    if (y !== null) window.scrollTo({ top: Number(y), behavior: "instant" as ScrollBehavior });
  }, [ready]);
}
