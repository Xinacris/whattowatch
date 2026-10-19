"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatRating, type DeckCard, type Provider, type TitleSummary } from "@wtw/core";
import { Poster, useT, usePrefs } from "@wtw/ui";

export type ResultItem = TitleSummary & { logos: Provider[] | null }; // null = not fetched yet

/** Search results. Logos come from the server for the first batch and load in one request for the rest. */
export function ResultGrid({ items }: { items: ResultItem[] }) {
  const t = useT();
  const { lang, region } = usePrefs();
  const [late, setLate] = useState<Record<string, Provider[]>>({});
  const missing = items.filter((i) => i.logos === null).map((i) => i.key).slice(0, 60).join(".");

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
      {items.map((item, i) => {
        const logos = (item.logos ?? late[item.key] ?? []).slice(0, 3);
        const rating = formatRating(item.rating);
        return (
          <li key={item.key} data-testid="search-result">
            <Link href={`/title/${item.type}/${item.id}`} className="group block">
              <Poster src={item.poster ? item.poster.replace("/w500/", "/w342/") : null} title={item.title} lang={lang} eager={i < 6} className="group-hover:border-label" />
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
          </li>
        );
      })}
    </ul>
  );
}
