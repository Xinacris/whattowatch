import { cleanQuery, guessLang, MIN_QUERY, suggest, tmdbLanguage, type Lang } from "@wtw/core";
import { metaLoader, tmdb } from "@wtw/ui/server";

const CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";

/** Instant suggestions. Cached hard at the edge: the same few letters get typed a lot. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = cleanQuery(url.searchParams.get("q"));
  if (q.length < MIN_QUERY) return Response.json({ items: [] }, { headers: { "cache-control": CACHE } });
  const lang: Lang = url.searchParams.get("lang") === "tr" ? "tr" : url.searchParams.get("lang") === "en" ? "en" : guessLang(req.headers.get("accept-language"));
  try {
    const language = tmdbLanguage(lang, "US");
    const items = await suggest(tmdb(), q, language, metaLoader(language, "US"));
    return Response.json({ items }, { headers: { "cache-control": CACHE } });
  } catch (err) {
    console.error("suggest", err instanceof Error ? err.message : err);
    return Response.json({ items: [], error: "tmdb_unavailable" }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
