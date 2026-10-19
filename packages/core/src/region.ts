export const REGIONS = ["US", "GB", "TR", "DE", "FR", "IT", "ES", "NL", "CA", "AU", "JP", "KR", "BR", "MX", "IN"] as const;
export type Lang = "en" | "tr";

/** TMDB content language for a UI language + region, e.g. ("tr","TR") -> "tr-TR". */
export function tmdbLanguage(lang: Lang, region: string): string {
  if (lang === "tr") return "tr-TR";
  return region === "GB" ? "en-GB" : "en-US";
}

/** Best-effort region from a country header or locale like "tr-TR" / "en_GB". */
export function guessRegion(country: string | null | undefined, locale?: string | null): string {
  const c = country?.trim().toUpperCase();
  if (c && /^[A-Z]{2}$/.test(c)) return c;
  const fromLocale = locale?.split(/[-_]/)[1]?.toUpperCase();
  if (fromLocale && /^[A-Z]{2}$/.test(fromLocale)) return fromLocale;
  return "US";
}

export function guessLang(locale: string | null | undefined): Lang {
  return locale?.toLowerCase().startsWith("tr") ? "tr" : "en";
}
