import "server-only";
import { cookies, headers } from "next/headers";
import { guessLang, guessRegion, tmdbLanguage, type Lang } from "@wtw/core";

export interface Prefs { lang: Lang; region: string; tmdbLang: string; services: number[] }

export const LANG_COOKIE = "wtw_lang";
export const REGION_COOKIE = "wtw_region";
export const SERVICES_COOKIE = "wtw_services";

const parseServices = (v: string | undefined) => (v ?? "").split(".").map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 30);

/** UI language, watch region and the services you pay for (remembered from /search). Region: explicit choice (cookie / ?region=) beats the IP country beats the browser. */
export async function getPrefs(regionOverride?: string | null): Promise<Prefs> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  const acceptLang = h.get("accept-language");
  const langCookie = c.get(LANG_COOKIE)?.value;
  const lang: Lang = langCookie === "tr" || langCookie === "en" ? langCookie : guessLang(acceptLang);
  const override = regionOverride && /^[A-Za-z]{2}$/.test(regionOverride) ? regionOverride.toUpperCase() : null;
  const region = override ?? c.get(REGION_COOKIE)?.value ?? guessRegion(h.get("x-vercel-ip-country"), acceptLang);
  return { lang, region, tmdbLang: tmdbLanguage(lang, region), services: parseServices(c.get(SERVICES_COOKIE)?.value) };
}
