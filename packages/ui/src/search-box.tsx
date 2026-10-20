"use client";
import { useId, useState, type KeyboardEvent } from "react";
import { t, type Lang, type Suggestion } from "@wtw/core";
import { usePrefs } from "./prefs-client";
import { useSuggestions } from "./use-suggestions";

const hrefOf = (s: Suggestion) => (s.kind === "person" ? `/person/${s.id}` : s.kind === "collection" ? `/collection/${s.id}` : `/title/${s.type}/${s.id}`);

function detailOf(lang: Lang, s: Suggestion): string {
  if (s.kind === "person") return t(lang, "suggest.person");
  if (s.kind === "collection") return t(lang, "series.films", { n: s.count ?? 0 });
  return [s.year, t(lang, s.type === "movie" ? "common.movie" : "common.tv")].filter(Boolean).join(" · ");
}

/**
 * Search with instant suggestions, as an ARIA combobox. Plain GET form underneath, so Enter
 * works even when suggestions don't. Links are full navigations: the header lives in both zones.
 */
export function SearchBox({ size = "header", initial = "", autoFocus = false }: { size?: "hero" | "header"; initial?: string; autoFocus?: boolean }) {
  const { lang } = usePrefs();
  const id = useId();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const items = useSuggestions(q, lang);
  const shown = open && items.length > 0;

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      // Cycles through the options and back to the text field (-1).
      const n = items.length + 1;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (((a + 1 + step) % n) + n) % n - 1);
    } else if (e.key === "Escape") {
      if (shown) { e.preventDefault(); setOpen(false); setActive(-1); } else setQ("");
    } else if (e.key === "Enter" && shown && items[active]) {
      e.preventDefault();
      window.location.assign(hrefOf(items[active]));
    }
  }

  const hero = size === "hero";
  return (
    <form action="/search" role="search" className="relative w-full" onSubmit={() => setOpen(false)}>
      <label htmlFor={`${id}-q`} className="sr-only">{t(lang, "suggest.label")}</label>
      <div className="flex">
        <input
          id={`${id}-q`} name="q" value={q} autoFocus={autoFocus} autoComplete="off" spellCheck={false}
          role="combobox" aria-expanded={shown} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={shown && active >= 0 ? `${id}-opt-${active}` : undefined}
          placeholder={t(lang, "search.placeholder")}
          className={`field min-w-0 flex-1 ${hero ? "py-4 text-xl sm:text-2xl" : "py-2 text-sm"}`}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKey}
        />
        <button className={`btn btn-label -ml-[2px] shadow-none ${hero ? "px-6" : "px-3 py-2"}`}>{t(lang, "nav.search")}</button>
      </div>
      <ul id={`${id}-list`} role="listbox" aria-label={t(lang, "suggest.label")} hidden={!shown}
        className="absolute inset-x-0 top-full z-40 mt-1 max-h-[70vh] overflow-y-auto border-2 border-paper bg-shelf">
        {items.map((s, i) => (
          <li key={`${s.kind}${s.type}${s.id}`} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}
            className={`border-b-2 border-rule last:border-b-0 ${i === active ? "bg-label text-label-ink" : ""}`}
            onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()}>
            <a href={hrefOf(s)} tabIndex={-1} className="flex items-center gap-3 px-2 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- TMDB w92 thumb */}
              {s.image ? <img src={s.image} alt="" className="h-12 w-8 shrink-0 object-cover" /> : <span className="h-12 w-8 shrink-0 bg-shelf-high" />}
              <span className="min-w-0">
                <span className="block truncate font-semibold">{s.label}</span>
                <span className={`label block text-[11px] ${i === active ? "" : "text-paper-dim"}`}>
                  {detailOf(lang, s)}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </form>
  );
}
