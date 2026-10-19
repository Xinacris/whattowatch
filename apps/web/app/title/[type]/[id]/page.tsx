import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatRating, formatRuntime, REGIONS, t, titleDetail, type MediaType } from "@wtw/core";
import { Poster, ProviderList, TapeMeta } from "@wtw/ui";
import { getPrefs, tmdb } from "@wtw/ui/server";
import { isId, orNotFound } from "@/lib/load";

type Props = PageProps<"/title/[type]/[id]">;

async function load({ params, searchParams }: Props) {
  const { type, id } = await params;
  if ((type !== "movie" && type !== "tv") || !isId(id)) notFound();
  const sp = await searchParams;
  const prefs = await getPrefs(typeof sp.region === "string" ? sp.region : null);
  const title = await orNotFound(titleDetail(tmdb(), type as MediaType, Number(id), prefs.tmdbLang, prefs.region));
  return { title, ...prefs };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { title } = await load(props);
  return { title: title.title, description: title.overview.slice(0, 160) };
}

export default async function TitlePage(props: Props) {
  const { title, lang, region } = await load(props);
  const seasons = title.seasons ? (title.seasons === 1 ? t(lang, "title.season") : t(lang, "title.seasons", { n: title.seasons })) : null;
  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <div className="max-w-[280px]">
          <Poster src={title.poster} title={title.title} lang={lang} eager />
        </div>
        <div className="min-w-0">
          <TapeMeta parts={[title.year, t(lang, title.type === "movie" ? "common.movie" : "common.tv"), formatRuntime(title.runtime), seasons, formatRating(title.rating) && `${formatRating(title.rating)}/10`]} />
          <h1 className="display mt-3 text-5xl break-words sm:text-6xl">{title.title}</h1>
          {title.tagline && <p className="mt-3 text-lg text-label italic">{title.tagline}</p>}
          <p className="mt-2 text-sm text-paper-dim">{title.genres.map((g) => g.name).join(" / ")}</p>
          <p className="mt-6 max-w-2xl leading-relaxed">{title.overview}</p>
          {title.directors.length > 0 && (
            <p className="mt-4 text-sm"><span className="label text-paper-dim">{t(lang, title.type === "movie" ? "title.directedBy" : "title.createdBy")}</span> {title.directors.join(", ")}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {title.trailer && <a className="btn btn-ghost" href={`https://www.youtube.com/watch?v=${title.trailer}`} target="_blank" rel="noreferrer">{t(lang, "title.trailer")} ↗</a>}
            {title.collection && <Link className="btn btn-ghost" href={`/collection/${title.collection.id}`}>{t(lang, "title.partOf", { name: title.collection.name })}</Link>}
          </div>
          <section className="tape mt-10 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="display text-2xl">{t(lang, "title.whereToWatch")}</h2>
              <form className="label flex items-center gap-2">
                <label htmlFor="region" className="text-paper-dim">{t(lang, "title.region")}</label>
                <select id="region" name="region" defaultValue={region} className="field py-1">
                  {[...new Set([region, ...REGIONS])].map((r) => <option key={r}>{r}</option>)}
                </select>
                <button className="btn btn-ghost px-2 py-1 text-xs">OK</button>
              </form>
            </div>
            <ProviderList providers={title.providers} link={title.providersLink} region={region} lang={lang} />
          </section>
        </div>
      </div>
      {title.cast.length > 0 && (
        <section className="mt-14">
          <h2 className="label text-paper-dim">{t(lang, "title.cast")}</h2>
          <ul className="mt-4 flex gap-4 overflow-x-auto pb-3">
            {title.cast.map((c) => (
              <li key={c.id} className="w-28 shrink-0">
                <Link href={`/person/${c.id}`} className="group block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- TMDB profile */}
                  {c.photo ? <img src={c.photo} alt="" loading="lazy" className="aspect-[2/3] w-full border-2 border-rule object-cover group-hover:border-label" /> : <div className="aspect-[2/3] border-2 border-rule bg-shelf-high" />}
                  <p className="mt-2 text-sm leading-tight font-semibold group-hover:text-label">{c.name}</p>
                  {c.role && <p className="mt-0.5 line-clamp-2 text-xs text-paper-dim">{c.role}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
