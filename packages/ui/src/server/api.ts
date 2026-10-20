import "server-only";
import { buildDeckPage, collection, collectionDeckCard, collectionSummaries, deckCard, parseItemKey, filtersFromQuery, guessLang, guessRegion, person, providersInRegion, search, searchCollections, titleDetail, tmdbLanguage, TmdbError, trending, type Lang } from "@wtw/core";
import { metaLoader } from "./movie-meta";
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

async function fixedCards(rawKeys: string, rawOnly: string, tl: string, region: string) {
  const keys = rawKeys.split(".").map(parseItemKey).filter((k) => k !== null).slice(0, 60);
  if (!keys.length) return null;
  const only = rawOnly.split(".").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const seriesIds = keys.flatMap((k) => (k.kind === "collection" ? [k.id] : []));
  const [titles, series] = await Promise.all([
    Promise.allSettled(keys.map((k) => (k.kind === "collection" ? Promise.reject(new Error("series")) : deckCard(tmdb(), k.kind, k.id, tl, region, only)))),
    seriesIds.length ? collectionSummaries(tmdb(), seriesIds, tl, metaLoader(tl, region)) : new Map(),
  ]);
  return keys.flatMap((k, i) => {
    if (k.kind === "collection") { const s = series.get(k.id); return s ? [collectionDeckCard(s, only)] : []; }
    const r = titles[i];
    return r?.status === "fulfilled" ? [r.value] : [];
  });
}

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
  /** Fixed decks: these keys (titles or series), in this order, as swipe cards. Anything that fails to load is dropped. */
  cards: (_s, { q, tl, region }) => fixedCards(q.get("keys") ?? "", q.get("providers") ?? "", tl, region),
  deck: (_s, { q, tl }) => {
    const seed = q.get("seed") ?? "";
    const page = positiveInt(q.get("page") ?? "0") ?? 0;
    if (!/^[a-z0-9]{1,24}$/.test(seed) || page > 50) return null;
    const f = filtersFromQuery(q);
    return buildDeckPage(tmdb(), f, seed, page, tl, metaLoader(tl, f.region));
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
