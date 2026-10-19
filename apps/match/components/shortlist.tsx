"use client";
import Link from "next/link";
import type { DeckCard } from "@wtw/core";
import { Poster, useT, usePrefs } from "@wtw/ui";

/** Ranked by when you agreed, first agreed first. */
export function Shortlist({ cards, onBack }: { cards: DeckCard[]; onBack?: () => void }) {
  const t = useT();
  const { lang } = usePrefs();
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h2 className="display text-5xl">{t("shortlist.title")}</h2>
      <p className="label mt-2 text-paper-dim">{t("shortlist.hint")}</p>
      {cards.length === 0 && <p className="mt-8 text-paper-dim">{t("shortlist.empty")}</p>}
      <ol className="mt-8 flex flex-col gap-3">
        {cards.map((c, i) => (
          <li key={c.key}>
            <a href={`/title/${c.type}/${c.id}`} className="tape flex items-center gap-4 p-2 pr-4 hover:border-label">
              <span className="display w-8 text-center text-3xl text-label">{i + 1}</span>
              <div className="w-14 shrink-0"><Poster src={c.poster ? c.poster.replace("/w500/", "/w154/") : null} title={c.title} lang={lang} /></div>
              <span className="min-w-0">
                <span className="block font-semibold break-words">{c.title}</span>
                <span className="label block text-paper-dim">{[c.year, ...c.genreNames].filter(Boolean).join(" · ")}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex gap-3">
        {onBack && <button type="button" className="btn btn-ghost" onClick={onBack}>{t("match.keepGoing")}</button>}
        <Link href="/match/new" className="btn btn-ghost">{t("shortlist.newNight")}</Link>
      </div>
    </section>
  );
}
