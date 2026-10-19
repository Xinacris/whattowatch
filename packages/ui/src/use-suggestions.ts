"use client";
import { useEffect, useState } from "react";
import { cleanQuery, MIN_QUERY, type Lang, type Suggestion } from "@wtw/core";

const DEBOUNCE_MS = 250;

/** Debounced suggestions from /api/suggest. Any failure means no dropdown, never an error box. */
export function useSuggestions(query: string, lang: Lang): Suggestion[] {
  const [items, setItems] = useState<{ q: string; list: Suggestion[] }>({ q: "", list: [] });
  const q = cleanQuery(query);
  useEffect(() => {
    if (q.length < MIN_QUERY) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(q)}&lang=${lang}`, { signal: ctl.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ items: Suggestion[] }>) : { items: [] }))
        .then((d) => setItems({ q, list: d.items ?? [] }))
        .catch(() => { if (!ctl.signal.aborted) setItems({ q, list: [] }); });
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [q, lang]);
  return q.length >= MIN_QUERY && items.q === q ? items.list : [];
}
