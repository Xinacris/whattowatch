"use client";
import { useEffect, useMemo, useState } from "react";
import { listNames, shortlist, type TitleKey, type Viewer, type Vote } from "@wtw/core";
import { useT, usePrefs } from "@wtw/ui";
import { api } from "@/lib/api";
import { useDeck } from "@/lib/deck-store";
import { useCards } from "@/lib/use-cards";
import { useRoom } from "@/lib/use-room";
import { getViewer, setViewerName } from "@/lib/viewer";
import { Deck } from "./deck";
import { Lobby } from "./lobby";
import { MatchOverlay } from "./match-overlay";
import { NameGate } from "./name-input";
import { RoomNotice } from "./room-notice";
import { Shortlist } from "./shortlist";

type Stage = "lobby" | "deck" | "shortlist";

export function LiveRoom({ code }: { code: string }) {
  const t = useT();
  const { lang } = usePrefs();
  const [viewer, setViewer] = useState<Viewer | null>(() => { const v = getViewer(); return v.name ? v : null; });
  const [draftName, setDraftName] = useState(() => getViewer().name);
  const [stage, setStage] = useState<Stage>("lobby");
  const { view, first, fatal, offline, apply, fail } = useRoom(code, viewer?.name ? viewer : null);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());


  // First view of the room: start the deck, resuming any votes from before a reload.
  useEffect(() => {
    if (first) useDeck.getState().start(first.filters, first.seed, lang, first.mine);
  }, [first, lang]);
  const resumed = first ? Object.keys(first.mine).length > 0 : false;
  const current: Stage = stage === "lobby" && resumed ? "deck" : stage;

  // A match from anyone's poll pops the match screen for everyone. Matches older than our arrival don't.
  const baseline = useMemo(() => new Set(first?.matches.map((m) => m.key) ?? []), [first]);
  const showing = view?.matches.find((m) => !baseline.has(m.key) && !dismissed.has(m.key))?.key ?? null;
  const dismiss = () => { if (showing) setDismissed((d) => new Set([...d, showing])); };

  const ranked = useMemo(() => shortlist(view?.matches ?? []), [view]);
  const cards = useCards(ranked);
  const matchCard = cards.find((c) => c.key === showing) ?? null;

  if (fatal) return <RoomNotice reason={fatal} />;
  if (!viewer?.name) {
    return <NameGate title={t("join.title", { code })} value={draftName} onChange={setDraftName} onSubmit={() => { setViewerName(draftName); setViewer(getViewer()); }} />;
  }
  if (!view) return <p className="label mx-auto max-w-md animate-pulse px-4 py-24 text-paper-dim">{t("common.loading")}</p>;

  const send = (key: string, vote: Vote | null) => api.vote(code, viewer, key as TitleKey, vote).then(apply, fail);
  const others = view.members.filter((m) => m.id !== viewer.id).map((m) => m.name);

  return (
    <>
      {offline && <p role="status" className="label bg-nope px-4 py-2 text-center text-label-ink">{t("room.offline")}</p>}
      {current === "lobby" && <Lobby code={code} members={view.members} me={viewer.id} onStart={() => setStage("deck")} />}
      {current === "deck" && (
        <Deck
          onVote={(key, vote) => void send(key, vote)}
          onUndo={(key) => void send(key, null)}
          exhausted={others.length > 0 && <p className="text-paper-dim">{t("room.waitingOn", { names: listNames(lang, others) })}</p>}
          aside={
            <div className="flex items-center justify-between border-t-2 border-rule pt-3">
              <span className="label text-paper-dim">{code} · {view.members.length}</span>
              <button type="button" className="label text-label hover:underline disabled:opacity-40" disabled={!ranked.length} onClick={() => setStage("shortlist")}>
                {t("deck.matchesSoFar", { n: ranked.length })} →
              </button>
            </div>
          }
        />
      )}
      {current === "shortlist" && <Shortlist cards={cards} onBack={() => setStage("deck")} />}
      {matchCard && (
        <MatchOverlay card={matchCard} onKeepGoing={() => { dismiss(); setStage("deck"); }} onSettle={() => { dismiss(); setStage("shortlist"); }} />
      )}
    </>
  );
}
