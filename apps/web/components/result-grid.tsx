"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatRating, seriesHitLabel, type DeckCard, type Lang, type Provider } from "@wtw/core";
import { CollectionCard, Poster, useT, usePrefs } from "@wtw/ui";
import type { ResultEntry } from "@/lib/search";

type Translate = ReturnType<typeof useT>;

/** Search results: titles and whole film series. Logos missing from the server load in one request. */
export function ResultGrid({ items }: { items: ResultEntry[] }) {
  const t = useT();
  const { lang, region } = usePrefs();
  const [late, setLate] = useState<Record<string, Provider[]>>({});
  const missing = items.flatMap((i) => (i.kind === "title" && i.logos === null ? [i.item.key] : [])).slice(0, 60).join(".");

  useEffect(() => {
    if (!missing) return;
    let live = true;
    fetch(`/api/tmdb/cards?keys=${missing}&region=${region}&lang=${lang}`)
      .then((r) => (r.ok ? (r.json() as Promise<DeckCard[]>) : []))
      .then((cards) => { if (live) setLate(Object.fromEntries(cards.map((c) => [c.key, c.providers]))); })
      .catch(() => {});
    return () => { live = false; };
  }, [missing, region, lang]);

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" data-testid="results-grid">
      {items.map((entry, i) => (
        <li key={entry.kind === "title" ? entry.item.key : entry.summary.key} data-testid="search-result">
          {entry.kind === "collection"
            ? <CollectionCard summary={entry.summary} lang={lang} logos={entry.logos} note={seriesNote(entry, t)} hit={entry.hit && seriesHitLabel(lang, entry.hit)} eager={i < 6} href={entry.hit ? `/collection/${entry.summary.id}?part=${entry.hit.id}#part-${entry.hit.id}` : undefined} />
            : <TitleCard entry={entry} logos={(entry.logos ?? late[entry.item.key] ?? []).slice(0, 3)} lang={lang} t={t} eager={i < 6} />}
        </li>
      ))}
    </ul>
  );
}

function seriesNote(e: Extract<ResultEntry, { kind: "collection" }>, t: Translate): string | null {
  const of = e.summary.partCount;
  if (e.matching === null) return null;
  return e.service ? t("series.onService", { n: e.matching, of, service: e.service }) : t("series.matching", { n: e.matching, of });
}

function TitleCard({ entry, logos, lang, t, eager }: { entry: Extract<ResultEntry, { kind: "title" }>; logos: Provider[]; lang: Lang; t: Translate; eager: boolean }) {
  const { item, partOf } = entry;
  const rating = formatRating(item.rating);
  return (
    <>
      <Link href={`/title/${item.type}/${item.id}`} className="group block">
        <Poster src={item.poster ? item.poster.replace("/w500/", "/w342/") : null} title={item.title} lang={lang} eager={eager} className="group-hover:border-label" />
        <p className="mt-2 text-sm leading-tight font-semibold break-words group-hover:text-label">{item.title}</p>
        <p className="label mt-1 text-[11px] text-paper-dim">
          {[item.year, t(item.type === "movie" ? "common.movie" : "common.tv"), rating && `${rating}/10`].filter(Boolean).join(" · ")}
        </p>
        {logos.length > 0 && (
          <span className="mt-2 flex gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- TMDB provider logos */}
            {logos.map((p) => p.logo && <img key={p.id} src={p.logo} alt={p.name} title={p.name} className="size-6 border border-rule" />)}
          </span>
        )}
      </Link>
      {partOf && <Link href={`/collection/${partOf.id}`} className="label mt-2 inline-block text-[11px] text-label underline-offset-2 hover:underline" data-testid="part-of">{t("title.partOf", { name: partOf.name })}</Link>}
    </>
  );
}
