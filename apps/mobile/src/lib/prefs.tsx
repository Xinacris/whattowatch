import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { guessLang, guessRegion, t as translate, type Lang, type StringKey } from "@wtw/core";

const locale = Intl.DateTimeFormat().resolvedOptions().locale;

interface Prefs { lang: Lang; region: string; setLang(l: Lang): void; t(key: StringKey, vars?: Record<string, string | number>): string }
const Ctx = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(guessLang(locale));
  const region = guessRegion(null, locale);
  const value = useMemo(() => ({ lang, region, setLang, t: (k: StringKey, v?: Record<string, string | number>) => translate(lang, k, v) }), [lang, region]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): Prefs {
  const v = useContext(Ctx);
  if (!v) throw new Error("PrefsProvider missing");
  return v;
}
