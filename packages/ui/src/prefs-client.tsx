"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { REGIONS, t, type Lang, type StringKey } from "@wtw/core";

interface PrefsValue { lang: Lang; region: string }
const PrefsContext = createContext<PrefsValue>({ lang: "en", region: "US" });

export function PrefsProvider({ value, children }: { value: PrefsValue; children: ReactNode }) {
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  return useContext(PrefsContext);
}

/** Client-side `t` bound to the current language. */
export function useT(): (key: StringKey, vars?: Record<string, string | number>) => string {
  const { lang } = usePrefs();
  return (key, vars) => t(lang, key, vars);
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function LangToggle() {
  const { lang } = usePrefs();
  const router = useRouter();
  const next: Lang = lang === "tr" ? "en" : "tr";
  return (
    <button
      type="button"
      className="label border-2 border-rule px-2 py-1 hover:border-paper"
      aria-label={next === "tr" ? "Türkçe" : "English"}
      onClick={() => { setCookie("wtw_lang", next); document.documentElement.lang = next; router.refresh(); }}
    >
      {next.toUpperCase()}
    </button>
  );
}

export function RegionSelect() {
  const { region } = usePrefs();
  const router = useRouter();
  const options: string[] = REGIONS.includes(region as (typeof REGIONS)[number]) ? [...REGIONS] : [region, ...REGIONS];
  return (
    <label className="label flex items-center gap-1 border-2 border-rule px-2 py-1 hover:border-paper">
      <span className="sr-only">{t(usePrefs().lang, "region.label")}</span>
      <select
        className="cursor-pointer bg-transparent outline-none"
        value={region}
        onChange={(e) => { setCookie("wtw_region", e.target.value); router.refresh(); }}
      >
        {options.map((r) => <option key={r} value={r} className="bg-shelf">{r}</option>)}
      </select>
    </label>
  );
}
