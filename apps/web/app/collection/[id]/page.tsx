import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { collectionSummaries, formatRating, formatRuntime, t, type CollectionPart, type Lang } from "@wtw/core";
import { JustWatchCredit, Poster, seriesLabel } from "@wtw/ui";
import { getPrefs, metaLoader, tmdb } from "@wtw/ui/server";
import { isId, orNotFound } from "@/lib/load";

type Props = PageProps<"/collection/[id]">;

async function load({ params, searchParams }: Props) {
  const { id } = await params;
  if (!isId(id)) notFound();
  const prefs = await getPrefs();
  const found = await orNotFound(collectionSummaries(tmdb(), [Number(id)], prefs.tmdbLang, metaLoader(prefs.tmdbLang, prefs.region)));
  const c = found.get(Number(id));
  if (!c) notFound();
  const part = Number((await searchParams).part);
  return { c, highlight: Number.isInteger(part) ? part : null, ...prefs };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await load(props)).c.name };
}

/** A film series: what's in it, in order, and where each part is streaming tonight. */
export default async function CollectionPage(props: Props) {
  const { c, lang, highlight } = await load(props);
  const first = c.parts[0];
  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <div className="max-w-[220px]"><Poster src={c.poster} title={c.name} lang={lang} eager /></div>
        <div className="min-w-0">
          <p className="label text-label">{seriesLabel(lang, c)}</p>
          <h1 className="display mt-2 text-5xl break-words sm:text-6xl">{c.name}</h1>
          {first && (
            <p className="mt-6 text-lg" data-testid="where-to-start">
              <span className="label mr-2 text-paper-dim">{t(lang, "series.whereToStart")}</span>
              <Link href={`/title/movie/${first.id}`} className="font-semibold underline underline-offset-4 hover:text-label">{first.title}{first.year ? ` (${first.year})` : ""}</Link>
            </p>
          )}
        </div>
      </div>
      <ol className="mt-12 flex flex-col gap-3" data-testid="collection-parts">
        {c.parts.map((p, i) => <PartRow key={p.id} part={p} n={i + 1} lang={lang} on={p.id === highlight} />)}
      </ol>
      {c.parts.some((p) => p.providers.length > 0) && <JustWatchCredit link={null} lang={lang} className="mt-4 block" />}
    </article>
  );
}

function PartRow({ part: p, n, lang, on }: { part: CollectionPart; n: number; lang: Lang; on: boolean }) {
  const rating = formatRating(p.rating);
  return (
    <li id={`part-${p.id}`} className={`tape flex scroll-mt-24 items-center gap-4 p-3 ${on ? "border-label text-label" : ""}`} data-testid="collection-part" aria-current={on || undefined}>
      <span className="display w-8 shrink-0 text-3xl text-paper-dim">{n}</span>
      <Link href={`/title/movie/${p.id}`} className="w-12 shrink-0"><Poster src={p.poster ? p.poster.replace("/w500/", "/w154/") : null} title={p.title} lang={lang} /></Link>
      <div className="min-w-0 flex-1">
        <Link href={`/title/movie/${p.id}`} className="font-semibold break-words hover:text-label">{p.title}</Link>
        <p className="label mt-1 text-[11px] text-paper-dim">{[p.year, formatRuntime(p.runtime), rating && `${rating}/10`].filter(Boolean).join(" · ")}</p>
      </div>
      <span className="flex shrink-0 flex-wrap justify-end gap-1">
        {p.providers.length === 0 && <span className="label text-[11px] text-seen">{t(lang, "series.nowhere")}</span>}
        {/* eslint-disable-next-line @next/next/no-img-element -- TMDB provider logos */}
        {p.providers.slice(0, 4).map((s) => s.logo && <img key={s.id} src={s.logo} alt={s.name} title={s.name} className="size-7 border border-rule" />)}
      </span>
    </li>
  );
}
