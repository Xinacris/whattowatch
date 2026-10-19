import "server-only";
import { buildDeckPage, collection, filtersFromQuery, guessLang, guessRegion, person, providersInRegion, search, searchCollections, titleDetail, tmdbLanguage, TmdbError, trending, type Lang } from "@wtw/core";
import { tmdb } from "./tmdb";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

function json(body: unknown, status = 200, cache = true): Response {
  return Response.json(body, { status, headers: cache && status === 200 ? { "cache-control": CACHE } : { "cache-control": "no-store" } });
}

function context(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;
  const lang: Lang = q.get("lang") === "tr" ? "tr" : q.get("lang") === "en" ? "en" : guessLang(req.headers.get("accept-language"));
  const region = guessRegion(q.get("region") ?? req.headers.get("x-vercel-ip-country"), req.headers.get("accept-language"));
  return { q, lang, region, tl: tmdbLanguage(lang, region) };
}

const positiveInt = (s: string | undefined) => (s && /^\d{1,9}$/.test(s) ? Number(s) : null);

type Route = (segments: string[], ctx: ReturnType<typeof context>) => Promise<unknown> | null;

/** Thin, typed proxy over @wtw/core. Unknown paths 404; the TMDB credential never leaves the server. */
const routes: Record<string, Route> = {
  trending: (_s, { tl }) => trending(tmdb(), tl),
  search: (_s, { q, tl }) => {
    const query = (q.get("q") ?? "").slice(0, 120);
    return Promise.all([search(tmdb(), query, tl), query ? searchCollections(tmdb(), query, tl) : []]).then(([r, collections]) => ({ ...r, collections }));
  },
  title: ([type, id], { tl, region }) => {
    const n = positiveInt(id);
    return (type === "movie" || type === "tv") && n ? titleDetail(tmdb(), type, n, tl, region) : null;
  },
  person: ([id], { tl }) => { const n = positiveInt(id); return n ? person(tmdb(), n, tl) : null; },
  collection: ([id], { tl }) => { const n = positiveInt(id); return n ? collection(tmdb(), n, tl) : null; },
  providers: (_s, { region, tl }) => providersInRegion(tmdb(), region, tl).then((providers) => ({ region, providers })),
  deck: (_s, { q, tl }) => {
    const seed = q.get("seed") ?? "";
    const page = positiveInt(q.get("page") ?? "0") ?? 0;
    if (!/^[a-z0-9]{1,24}$/.test(seed) || page > 50) return null;
    return buildDeckPage(tmdb(), filtersFromQuery(q), seed, page, tl);
  },
};

export async function handleTmdbApi(req: Request, segments: string[]): Promise<Response> {
  const [head, ...rest] = segments;
  const route = head ? routes[head] : undefined;
  const work = route?.(rest, context(req));
  if (!work) return json({ error: "not_found" }, 404);
  try {
    return json(await work);
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) return json({ error: "not_found" }, 404);
    console.error("tmdb proxy", err instanceof Error ? err.message : err);
    return json({ error: "tmdb_unavailable" }, 502);
  }
}
