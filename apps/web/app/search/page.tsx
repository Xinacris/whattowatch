import type { Metadata } from "next";
import Link from "next/link";
import { search, searchCollections, t } from "@wtw/core";
import { getPrefs, tmdb } from "@wtw/ui/server";
import { TitleGrid } from "@/components/title-grid";

export const metadata: Metadata = { title: "Search" };

const FILTERS = ["all", "movie", "tv"] as const;

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 120) : "";
  const type = FILTERS.find((f) => f === sp.type) ?? "all";
  const { lang, tmdbLang } = await getPrefs();
  const [results, collections] = q ? await Promise.all([search(tmdb(), q, tmdbLang), searchCollections(tmdb(), q, tmdbLang)]) : [null, []];
  const titles = results?.titles.filter((r) => type === "all" || r.type === type) ?? [];
  const nothing = results && !titles.length && !results.people.length && !collections.length;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="display text-5xl">{t(lang, "search.title")}</h1>
      <form className="mt-6 flex max-w-xl">
        <input name="q" defaultValue={q} autoFocus className="field flex-1" placeholder={t(lang, "search.placeholder")} />
        <button className="btn btn-label -ml-[2px] shadow-none">{t(lang, "nav.search")}</button>
      </form>
      {!q && <p className="mt-10 text-paper-dim">{t(lang, "search.prompt")}</p>}
      {nothing && <p className="mt-10 text-paper-dim">{t(lang, "search.empty")}</p>}
      {collections.length > 0 && (
        <section className="mt-10">
          <h2 className="label text-paper-dim">{t(lang, "search.collections")}</h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {collections.map((c) => (
              <li key={c.id}><Link href={`/collection/${c.id}`} className="sticker rotate-[-1deg] hover:rotate-0">{c.name}</Link></li>
            ))}
          </ul>
        </section>
      )}
      {results && results.titles.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-4">
            <h2 className="label text-paper-dim">{t(lang, "search.titles")}</h2>
            <nav className="flex gap-1">
              {FILTERS.map((f) => (
                <Link key={f} href={`/search?q=${encodeURIComponent(q)}&type=${f}`} aria-pressed={f === type} className="chip py-1 text-xs">
                  {t(lang, f === "all" ? "search.all" : f === "movie" ? "common.movie" : "common.tv")}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-5"><TitleGrid items={titles} lang={lang} /></div>
        </section>
      )}
      {results && results.people.length > 0 && (
        <section className="mt-12">
          <h2 className="label text-paper-dim">{t(lang, "search.people")}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.people.slice(0, 9).map((p) => (
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
      )}
    </div>
  );
}

