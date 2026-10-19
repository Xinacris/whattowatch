import type { Metadata } from "next";
import Link from "next/link";
import { isSearchMode, loosenOptions, MIN_QUERY, parseSearch, providersInRegion, searchCollections, searchHref, t, TmdbError, MAX_SEARCH_PAGES } from "@wtw/core";
import { Notice, SearchBox } from "@wtw/ui";
import { getPrefs, tmdb } from "@wtw/ui/server";
import { ResultGrid } from "@/components/result-grid";
import { SearchFilters } from "@/components/search-filters";
import { runSearch } from "@/lib/search";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const f = parseSearch({ get: (k) => { const v = sp[k]; return typeof v === "string" ? v : null; } });
  const { lang, region, tmdbLang, services } = await getPrefs();
  const searching = isSearchMode(f);
  const [found, collections, providers] = await Promise.all([
    runSearch(f, region, tmdbLang, services).catch((e: unknown) => { if (e instanceof TmdbError && e.transient) return "busy" as const; throw e; }),
    searching ? searchCollections(tmdb(), f.q, tmdbLang).catch(() => []) : [],
    providersInRegion(tmdb(), region, tmdbLang).then((ps) => ps.filter((p) => !/channel/i.test(p.name)).slice(0, 18)).catch(() => []),
  ]);
  const heading = searching ? t(lang, "search.results", { q: f.q }) : t(lang, "search.browse");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl"><SearchBox key={f.q} initial={f.q} size="hero" /></div>
      {f.q && !searching && <p className="label mt-3 text-paper-dim">{t(lang, "search.short", { n: MIN_QUERY })}</p>}
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
        <SearchFilters key={searchHref({ ...f, page: 1 })} filters={f} providers={providers} />
        <div className="min-w-0">
          <h1 className="display text-4xl break-words sm:text-5xl">{heading}</h1>
          {found === "busy" ? (
            <Notice title={t(lang, "search.busy")} action={<Link href={searchHref(f)} className="btn btn-label">{t(lang, "common.retry")}</Link>} />
          ) : (
            <>
              {found.items.length > 0 && <div className="mt-6"><ResultGrid items={found.items} /></div>}
              {found.items.length === 0 && <Empty f={f} lang={lang} />}
              {found.more && f.page < MAX_SEARCH_PAGES && found.items.length > 0 && (
                <Link href={searchHref({ ...f, page: f.page + 1 })} scroll={false} className="btn btn-ghost mt-10" data-testid="load-more">{t(lang, "search.loadMore")}</Link>
              )}
              {collections.length > 0 && (
                <section className="mt-12">
                  <h2 className="label text-paper-dim">{t(lang, "search.collections")}</h2>
                  <ul className="mt-3 flex flex-wrap gap-3">
                    {collections.map((c) => <li key={c.id}><Link href={`/collection/${c.id}`} className="sticker rotate-[-1deg] hover:rotate-0">{c.name}</Link></li>)}
                  </ul>
                </section>
              )}
              {found.people.length > 0 && <People people={found.people} lang={lang} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ f, lang }: { f: ReturnType<typeof parseSearch>; lang: "en" | "tr" }) {
  const ways = loosenOptions(f);
  return (
    <div className="mt-8 max-w-lg" data-testid="search-empty">
      <p className="display text-3xl">{ways.length ? t(lang, "search.emptyFiltered") : t(lang, "search.empty")}</p>
      {ways.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="label text-paper-dim">{t(lang, "loosen.title")}</span>
          {ways.map((w) => <Link key={w.key} href={searchHref(w.filters)} className="chip py-1">{t(lang, `loosen.${w.key}`)}</Link>)}
        </div>
      )}
    </div>
  );
}

function People({ people, lang }: { people: Awaited<ReturnType<typeof runSearch>>["people"]; lang: "en" | "tr" }) {
  return (
    <section className="mt-12">
      <h2 className="label text-paper-dim">{t(lang, "search.people")}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.slice(0, 9).map((p) => (
          <li key={p.id}>
            <Link href={`/person/${p.id}`} className="tape flex items-center gap-3 p-2 hover:border-label">
              {/* eslint-disable-next-line @next/next/no-img-element -- TMDB profile thumb */}
              {p.photo ? <img src={p.photo} alt="" className="h-16 w-12 object-cover" /> : <span className="h-16 w-12 bg-shelf-high" />}
              <span>
                <span className="block font-semibold">{p.name}</span>
                <span className="block text-sm text-paper-dim">{p.knownFor.join(", ")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
