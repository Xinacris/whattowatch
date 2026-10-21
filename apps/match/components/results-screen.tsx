"use client";
import Link from "next/link";
import { useState } from "react";
import { formatRating, formatRuntime, itemHref, listNames, type DeckCard, type ItemKey } from "@wtw/core";
import { CollectionCard, Poster, ProviderList, seriesLabel, useT, usePrefs } from "@wtw/ui";
import { useCards } from "@/lib/use-cards";
import { shareUrl } from "@/lib/share";

interface Props {
  results: ItemKey[];
  names: string[];
  sendBack?: string | null; // results link
  addPerson?: string | null; // same deck for one more voter
  onSwap?: (() => void) | null;
}

export function ResultsScreen({ results, names, sendBack, addPerson, onSwap }: Props) {
  const t = useT();
  const { lang } = usePrefs();
  const cards = useCards(results);
  const zero = results.length === 0;
  const [more, setMore] = useState(false); // zero overlap: two buttons up front, the rest behind "More"
  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6" data-testid="results">
      <h1 className="display text-5xl text-label sm:text-7xl">{zero ? t("results.zero") : t(names.length > 2 ? "results.titleMany" : "results.title")}</h1>
      <p className="label mt-3 text-paper-dim">{t("results.who", { names: listNames(lang, names) })}</p>
      {zero && <p className="mt-6 max-w-md text-lg">{t("results.zeroBody")}</p>}
      {!zero && cards.length < results.length && <p className="label mt-8 animate-pulse text-paper-dim">{t("results.loading")}</p>}
      <ol className="mt-10 flex flex-col gap-6">
        {cards.map((c, i) => <ResultCard key={c.key} card={c} rank={i + 1} />)}
      </ol>
      <div className="mt-12 flex flex-wrap items-center gap-3 border-t-2 border-rule pt-6">
        {zero && onSwap && <button type="button" className="btn btn-label" onClick={onSwap} data-testid="swap">{t("results.swap")} →</button>}
        {zero && <Link href="/match/new" className="btn btn-ghost">{t("deck.loosen")}</Link>}
        {(zero ? more : true) && sendBack && <ShareButton url={sendBack} label={t("results.sendBack")} primary={!zero} testId="send-back" />}
        {(zero ? more : true) && addPerson && <ShareButton url={addPerson} label={t("results.addPerson")} testId="add-person" />}
        {zero && !more && (sendBack || addPerson) && (
          <button type="button" className="label text-paper-dim underline underline-offset-4 hover:text-label" onClick={() => setMore(true)} data-testid="more">{t("results.more")}</button>
        )}
      </div>
    </section>
  );
}

function ResultCard({ card, rank }: { card: DeckCard; rank: number }) {
  const t = useT();
  const { lang, region } = usePrefs();
  const rating = formatRating(card.rating) && `${formatRating(card.rating)}/10`;
  const series = card.collection;
  const first = series?.parts[0];
  const meta = (series ? [seriesLabel(lang, series), rating] : [card.year, formatRuntime(card.runtime), rating, ...card.genreNames]).filter(Boolean).join("  ·  ");
  return (
    <li className="tape grid grid-cols-[96px_1fr] gap-4 p-3 sm:grid-cols-[160px_1fr] sm:gap-6 sm:p-4" style={{ transform: `rotate(${rank % 2 ? -0.4 : 0.4}deg)` }} data-testid="result">
      {series ? <CollectionCard summary={series} lang={lang} eager bare /> : <Poster src={card.poster} title={card.title} lang={lang} eager />}
      <div className="flex min-w-0 flex-col gap-3">
        <span className="display text-4xl text-label">{rank}</span>
        <p className="display text-3xl break-words sm:text-4xl">{card.title}</p>
        <p className="label text-paper-dim">{meta}</p>
        {first && <p className="font-semibold" data-testid="start-with">{t("series.startWith", { title: first.title, year: first.year ?? "" })}</p>}
        <ProviderList providers={card.providers} link={card.providersLink ?? null} region={region} lang={lang} empty={t("results.notStreaming", { region })} />
        <a href={itemHref(card.key)} className="btn btn-label mt-auto self-start">{t("results.where")} →</a>
      </div>
    </li>
  );
}

function ShareButton({ url, label, primary = false, testId }: { url: string; label: string; primary?: boolean; testId: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={`btn ${primary ? "btn-label" : "btn-ghost"}`} data-testid={testId} data-url={url} onClick={async () => setDone(await shareUrl(url))}>
      {done ? t("link.copied") : label}
    </button>
  );
}
