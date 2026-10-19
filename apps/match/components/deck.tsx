"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { tilt } from "@wtw/tokens";
import type { Vote } from "@wtw/core";
import { useT } from "@wtw/ui";
import { remaining, useDeck } from "@/lib/deck-store";
import { CardFace } from "./card-face";
import { SwipeCard, type SwipeHandle } from "./swipe-card";

interface Props {
  onVote(key: string, vote: Vote): void;
  onUndo(key: string): void;
  aside?: ReactNode; // share button, match count, who we're waiting on
  exhausted?: ReactNode; // what to show when you're through the whole stack
}

const KEYS: Record<string, Vote> = { ArrowRight: "like", ArrowLeft: "nope", ArrowUp: "seen" };

export function Deck({ onVote, onUndo, aside, exhausted }: Props) {
  const t = useT();
  const state = useDeck();
  const left = remaining(state);
  const top = left[0];
  const next = left[1];
  const card = useRef<SwipeHandle>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const vote = KEYS[e.key];
      if (vote) { e.preventDefault(); card.current?.fling(vote); }
      if (e.key === "Backspace" || (e.key === "z" && (e.metaKey || e.ctrlKey))) undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function commit(vote: Vote) {
    const s = useDeck.getState().swipe(vote);
    setFlipped(false);
    if (s) onVote(s.key, s.vote);
  }
  function undo() {
    const s = useDeck.getState().undo();
    if (s) onUndo(s.key);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <div className="relative aspect-[2/3.35] w-full">
        {next && (
          <div className="absolute inset-0 opacity-70" style={{ transform: `rotate(${tilt[1]}deg) scale(0.96)` }} aria-hidden>
            <CardFace card={next} flipped={false} drag={{ x: 0, y: 0 }} />
          </div>
        )}
        {top && (
          <SwipeCard key={top.key} ref={card} label={top.title} onCommit={commit} onTap={() => setFlipped((f) => !f)}>
            {(drag) => <CardFace card={top} flipped={flipped} drag={drag} />}
          </SwipeCard>
        )}
        {!top && <DeckEmpty loading={state.loading} error={state.error} done={state.done} onRetry={() => void state.fetchMore()} exhausted={exhausted} />}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
        <button type="button" className="btn btn-ghost justify-center border-nope text-nope" disabled={!top} onClick={() => card.current?.fling("nope")}>← {t("deck.nope")}</button>
        <button type="button" className="btn btn-ghost justify-center px-3 text-paper-dim" disabled={!top} onClick={() => card.current?.fling("seen")}>↑ {t("deck.seen")}</button>
        <button type="button" className="btn btn-label justify-center" disabled={!top} onClick={() => card.current?.fling("like")}>{t("deck.like")} →</button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="label text-paper-dim underline-offset-4 hover:text-label hover:underline disabled:opacity-30" disabled={!state.last} onClick={undo}>↶ {t("deck.undo")}</button>
        <span className="label hidden text-seen sm:inline">{t("deck.keys")}</span>
      </div>
      {aside}
    </div>
  );
}

function DeckEmpty({ loading, error, done, onRetry, exhausted }: { loading: boolean; error: boolean; done: boolean; onRetry(): void; exhausted?: ReactNode }) {
  const t = useT();
  const box = "tape absolute inset-0 flex flex-col justify-center gap-5 p-6";
  if (error) return <div className={box}><p className="display text-3xl">{t("common.error")}</p><button className="btn btn-label self-start" onClick={onRetry}>{t("common.retry")}</button></div>;
  if (loading || !done) return <div className={box}><p className="label animate-pulse text-paper-dim">{t("deck.loadingMore")}</p></div>;
  return (
    <div className={box}>
      <p className="display text-3xl">{t("deck.empty")}</p>
      {exhausted}
      <Link href="/match/new" className="btn btn-ghost self-start">{t("deck.loosen")}</Link>
    </div>
  );
}
