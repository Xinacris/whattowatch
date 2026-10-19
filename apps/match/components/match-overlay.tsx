"use client";
import { formatRuntime, type DeckCard } from "@wtw/core";
import { Poster, useT, usePrefs } from "@wtw/ui";

/** "Bu akşam bu." Everyone in the room sees this when the last yes lands. */
export function MatchOverlay({ card, onKeepGoing, onSettle }: { card: DeckCard; onKeepGoing(): void; onSettle(): void }) {
  const t = useT();
  const { lang } = usePrefs();
  return (
    <div role="dialog" aria-modal aria-labelledby="match-title" className="fixed inset-0 z-50 overflow-y-auto bg-shelf/95">
      <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10 sm:grid-cols-[220px_1fr] sm:py-20">
        <div className="relative max-w-[220px] rotate-[-2deg]">
          <span className="sticker absolute -top-3 -right-3 z-10 rotate-6">{t("match.everyone")}</span>
          <Poster src={card.poster} title={card.title} lang={lang} eager />
        </div>
        <div>
          <h2 id="match-title" className="display text-6xl text-label sm:text-7xl">{t("match.title")}</h2>
          <p className="display mt-4 text-3xl break-words">{card.title}</p>
          <p className="label mt-2 text-paper-dim">{[card.year, formatRuntime(card.runtime), ...card.genreNames].filter(Boolean).join("  ·  ")}</p>
          {card.providers.length > 0 && (
            <div className="mt-6">
              <p className="label text-paper-dim">{t("match.watchOn")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {card.providers.map((p) => (
                  <a key={p.id} href={`/title/${card.type}/${card.id}`} className="flex items-center gap-2 border-2 border-rule py-1 pr-3 pl-1 hover:border-label">
                    {/* eslint-disable-next-line @next/next/no-img-element -- TMDB provider logo */}
                    {p.logo && <img src={p.logo} alt="" className="size-7" />}
                    <span className="label normal-case tracking-normal">{p.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="btn btn-label" onClick={onSettle} autoFocus>{t("match.settle")}</button>
            <button type="button" className="btn btn-ghost" onClick={onKeepGoing}>{t("match.keepGoing")}</button>
            <a className="btn btn-ghost" href={`/title/${card.type}/${card.id}`}>{t("match.details")} ↗</a>
          </div>
        </div>
      </div>
    </div>
  );
}
