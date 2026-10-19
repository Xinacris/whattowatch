"use client";
import { useState } from "react";
import { t } from "@wtw/core";
import { usePrefs } from "./prefs-client";
import { SearchBox } from "./search-box";

/** Inline on wide screens; on phones an icon that opens the same box on its own row. */
export function HeaderSearch() {
  const { lang } = usePrefs();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="hidden w-72 sm:block lg:w-80"><SearchBox /></div>
      <button type="button" className="border-2 border-rule p-1.5 hover:border-paper sm:hidden" aria-expanded={open} aria-controls="header-search" aria-label={t(lang, "suggest.open")} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 5 5" /></svg>
      </button>
      {open && <div id="header-search" className="absolute inset-x-0 top-full z-30 border-b-2 border-rule bg-shelf px-4 py-3 sm:hidden"><SearchBox autoFocus /></div>}
    </>
  );
}
