"use client";
import { formatRating, formatRuntime, seriesHitLabel, type CollectionSummary, type DeckCard } from "@wtw/core";
import { Poster, seriesLabel, useT, usePrefs } from "@wtw/ui";

function Stamp({ text, tone, opacity, className }: { text: string; tone: string; opacity: number; className: string }) {
  if (opacity <= 0.02) return null;
  return (
    <span className={`display pointer-events-none absolute z-10 border-4 px-3 py-1 text-4xl ${className}`} style={{ opacity, color: tone, borderColor: tone }}>
      {text}
    </span>
  );
}

/** Front: the tape box. Back: the blurb on the back of the box. */
export function CardFace({ card, flipped, drag }: { card: DeckCard; flipped: boolean; drag: { x: number; y: number } }) {
  const t = useT();
  const { lang } = usePrefs();
  const like = Math.min(1, Math.max(0, drag.x / 110));
  const nope = Math.min(1, Math.max(0, -drag.x / 110));
  const rewatch = Math.min(1, Math.max(0, -drag.y / 110)) * (Math.abs(drag.y) > Math.abs(drag.x) ? 1 : 0);
  const rating = formatRating(card.rating) && `${formatRating(card.rating)}/10`;
  const series = card.collection;
  const meta = (series ? [seriesLabel(lang, series), rating] : [card.year, formatRuntime(card.runtime), rating]).filter(Boolean).join("  ·  ");
  return (
    <div className="relative flex h-full flex-col overflow-hidden border-2 border-paper bg-shelf-raised">
      <Stamp text={t("deck.like")} tone="var(--wtw-label)" opacity={like} className="top-6 left-5 -rotate-12" />
      <Stamp text={t("deck.nope")} tone="var(--wtw-nope)" opacity={nope} className="top-6 right-5 rotate-12" />
      <Stamp text={t("deck.rewatch")} tone="var(--wtw-paper)" opacity={rewatch} className="bottom-32 left-1/2 -translate-x-1/2 -rotate-3" />
      {flipped && series ? <SeriesBack series={series} hit={card.hit?.id ?? null} /> : flipped ? (
        <div className="flex-1 overflow-y-auto p-5">
          <p className="label text-paper-dim">{meta}</p>
          <p className="display mt-2 text-3xl break-words">{card.title}</p>
          <p className="mt-4 leading-relaxed">{card.overview || t("deck.noPlot")}</p>
          {card.cast.length > 0 && <p className="mt-4 text-sm text-paper-dim"><span className="label">{t("deck.starring")}</span> {card.cast.join(", ")}</p>}
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <Poster src={card.poster} title={card.title} lang={lang} eager className="h-full w-full border-0 object-cover" />
          {series && <span className="sticker absolute top-3 left-3 rotate-[-2deg] text-sm" data-testid="series-label">{seriesLabel(lang, series)}</span>}
          {card.hit && <span className="tape label absolute bottom-3 left-3 max-w-[85%] px-2 py-1 text-[11px] break-words" data-testid="series-hit">{seriesHitLabel(lang, card.hit)}</span>}
        </div>
      )}
      <div className="border-t-2 border-paper bg-shelf p-3">
        <div className="flex items-start justify-between gap-3">
          <p className="display line-clamp-2 text-2xl leading-none break-words">{card.title}</p>
          {card.providers.length > 0 && (
            <div className="flex shrink-0 gap-1">
              {card.providers.slice(0, 3).map((p) => (
                // eslint-disable-next-line @next/next/no-img-element -- TMDB provider logo
                p.logo ? <img key={p.id} src={p.logo} alt={p.name} title={p.name} className="size-7 border border-rule" /> : null
              ))}
            </div>
          )}
        </div>
        <p className="label mt-2 text-paper-dim">{[meta, ...card.genreNames].filter(Boolean).join("  ·  ")}</p>
        <p className="label mt-1 text-[10px] text-seen">{flipped ? t(series ? "series.flipBack" : "deck.flipBack") : t(series ? "series.flip" : "deck.flip")}</p>
      </div>
    </div>
  );
}

/** The back of a box set: every film in it, in order. */
function SeriesBack({ series, hit }: { series: CollectionSummary; hit: number | null }) {
  return (
    <ol className="flex-1 overflow-y-auto p-5" data-testid="series-back">
      {series.parts.map((p, i) => (
        <li key={p.id} className={`flex items-baseline gap-3 border-b-2 border-rule py-2 last:border-b-0 ${p.id === hit ? "text-label" : ""}`} aria-current={p.id === hit || undefined} data-hit={p.id === hit || undefined}>
          <span className="display w-6 shrink-0 text-2xl text-paper-dim">{i + 1}</span>
          <span className="min-w-0 flex-1 font-semibold break-words">{p.title}</span>
          <span className="label shrink-0 text-paper-dim">{[p.year, formatRuntime(p.runtime)].filter(Boolean).join(" · ")}</span>
        </li>
      ))}
    </ol>
  );
}
