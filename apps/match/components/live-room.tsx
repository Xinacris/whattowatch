"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listNames, ROUND_EXTRA, ROUND_FIRST, likesNeeded, type RoomView, type TitleKey, type Viewer, type Vote } from "@wtw/core";
import { Notice, useT, usePrefs } from "@wtw/ui";
import { api } from "@/lib/api";
import { useDeck } from "@/lib/deck-store";
import { useRoom } from "@/lib/use-room";
import { getViewer, setViewerName } from "@/lib/viewer";
import { Deck } from "./deck";
import { Lobby } from "./lobby";
import { NameGate } from "./name-input";
import { ResultsScreen } from "./results-screen";
import { RoomNotice } from "./room-notice";
import { RoundCounter } from "./round-counter";

type Stage = "lobby" | "deck" | "waiting" | "results";

/** Lobby until someone starts; then the shared deck; then results once every present member is through. */
function stageOf(view: RoomView, started: boolean, votes: Record<string, Vote>): Stage {
  if (view.done) return "results";
  if (!started) return "lobby";
  return view.deck.every((k) => votes[k]) ? "waiting" : "deck";
}

export function LiveRoom({ code }: { code: string }) {
  const t = useT();
  const { lang } = usePrefs();
  const [viewer, setViewer] = useState<Viewer | null>(() => { const v = getViewer(); return v.name ? v : null; });
  const [draftName, setDraftName] = useState(() => getViewer().name);
  const [started, setStarted] = useState(false);
  const { view, first, fatal, offline, apply, fail } = useRoom(code, viewer?.name ? viewer : null);
  const votes = useDeck((s) => s.votes);

  // First view: start the shared deck, resuming votes from before a reload. Later views may deal more.
  useEffect(() => {
    if (first) useDeck.getState().start(first.filters, first.seed, lang, first.mine, { keys: first.deck });
  }, [first, lang]);
  useEffect(() => { if (view) useDeck.getState().setKeys(view.deck); }, [view]);

  if (fatal) return <RoomNotice reason={fatal} />;
  if (!viewer?.name) {
    return <NameGate title={t("join.title", { code })} value={draftName} onChange={setDraftName} onSubmit={() => { setViewerName(draftName); setViewer(getViewer()); }} />;
  }
  if (!view) return <p className="label mx-auto max-w-md animate-pulse px-4 py-24 text-paper-dim">{t("common.loading")}</p>;

  const send = (key: string, vote: Vote | null) => api.vote(code, viewer, key as TitleKey, vote).then(apply, fail);
  const resumed = first ? Object.keys(first.mine).length > 0 : false;
  const mine = view.deck.map((k) => votes[k]);
  const voted = mine.filter((v) => v === "like" || v === "nope").length;
  const swiped = mine.filter(Boolean).length;
  const grew = view.deck.length > ROUND_FIRST && swiped === view.deck.length - ROUND_EXTRA;

  const stage = stageOf(view, started || resumed, votes);
  return (
    <>
      {offline && <p role="status" className="label bg-nope px-4 py-2 text-center text-label-ink">{t("room.offline")}</p>}
      {stage === "lobby" && <Lobby code={code} members={view.members} me={viewer.id} onStart={() => setStarted(true)} />}
      {stage === "deck" && (
        <Deck
          onVote={(key, vote) => void send(key, vote)}
          onUndo={(key) => void send(key, null)}
          banner={grew ? t("round.roomMore") : null}
          aside={<RoundCounter liked={mine.filter((v) => v === "like").length} need={likesNeeded(Math.max(voted, view.deck.length - mine.filter((v) => v === "seen").length))} card={Math.min(swiped + 1, view.deck.length)} of={view.deck.length} />}
        />
      )}
      {stage === "waiting" && <Notice title={t("room.through")} body={view.waitingOn.length ? t("room.waitingFor", { names: listNames(lang, view.waitingOn) }) : t("common.loading")} />}
      {stage === "results" && (
        <>
          <ResultsScreen results={view.results ?? []} names={view.members.map((m) => m.name)} />
          <div className="mx-auto max-w-4xl px-4 sm:px-6"><Link href="/match/new" className="btn btn-ghost">{t("shortlist.newNight")}</Link></div>
        </>
      )}
    </>
  );
}
