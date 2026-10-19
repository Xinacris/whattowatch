"use client";
import { useEffect, useMemo, useState } from "react";
import { encodeLink, linkMatches, listNames, type LinkPayload, type LinkVoter, type TitleKey } from "@wtw/core";
import { useT, usePrefs } from "@wtw/ui";
import { useDeck } from "@/lib/deck-store";
import { loadProgress, saveProgress } from "@/lib/link-progress";
import { useCards } from "@/lib/use-cards";
import { getViewer, setViewerName } from "@/lib/viewer";
import { Deck } from "./deck";
import { MatchOverlay } from "./match-overlay";
import { NameGate } from "./name-input";
import { Shortlist } from "./shortlist";

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

export function LinkRoom({ payload }: { payload: LinkPayload }) {
  const t = useT();
  const { lang } = usePrefs();
  const [name, setName] = useState<string | null>(() => getViewer().name || null);
  const [draft, setDraft] = useState(() => getViewer().name);
  const [showing, setShowing] = useState<TitleKey | null>(null);
  const [list, setList] = useState(false);
  const [copied, setCopied] = useState(false);
  const votes = useDeck((s) => s.votes);
  const cardsLoaded = useDeck((s) => s.cards);

  useEffect(() => {
    if (name) useDeck.getState().start(payload.filters, payload.seed, lang, loadProgress(payload.seed));
  }, [name, payload, lang]);
  useEffect(() => { if (name) saveProgress(payload.seed, votes); }, [votes, name, payload.seed]);

  const others = useMemo(() => payload.voters.filter((v) => !name || !sameName(v.name, name)), [payload.voters, name]);
  const me: LinkVoter = useMemo(() => ({
    name: name ?? "",
    likes: Object.entries(votes).filter(([, v]) => v === "like").map(([k]) => k as TitleKey),
    seen: Object.entries(votes).filter(([, v]) => v === "seen").map(([k]) => k as TitleKey),
  }), [votes, name]);
  const order = useMemo(() => cardsLoaded.map((c) => c.key), [cardsLoaded]);
  const matches = useMemo(() => (others.length ? linkMatches([...others, me], order) : []), [others, me, order]);
  const cards = useCards(matches);
  const matchCard = cards.find((c) => c.key === showing) ?? null;

  if (!name) return <NameGate title={others.length ? t("link.yourTurn", { names: listNames(lang, others.map((o) => o.name)) }) : t("setup.title")} value={draft} onChange={setDraft} onSubmit={() => { setViewerName(draft); setName(draft.trim()); }} />;

  async function share() {
    const url = `${window.location.origin}/match/link?d=${encodeLink({ ...payload, voters: [...others, me] })}`;
    window.history.replaceState(null, "", url); // first, so back/reload keeps the latest picks even if copying fails
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ url, title: "WhatToWatch" });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch { /* cancelled, or clipboard blocked: the address bar has the link */ }
  }

  const swiped = Object.keys(votes).length;
  return (
    <>
      {others.length > 0 && <p className="label mx-auto max-w-md px-4 pt-6 text-label">{t("link.yourTurn", { names: listNames(lang, others.map((o) => o.name)) })}</p>}
      {list ? <Shortlist cards={cards} onBack={() => setList(false)} /> : (
        <Deck
          onVote={(key, vote) => { if (vote === "like" && others.length && linkMatches([...others, { ...me, likes: [...me.likes, key as TitleKey] }]).includes(key as TitleKey)) setShowing(key as TitleKey); }}
          onUndo={() => setCopied(false)}
          exhausted={<p className="text-paper-dim">{t("link.done")}</p>}
          aside={
            <div className="flex flex-col gap-3 border-t-2 border-rule pt-4">
              <div className="flex items-center justify-between">
                <button type="button" className="btn btn-label" disabled={swiped === 0} onClick={share} data-testid="share">{copied ? t("link.copied") : t("link.share")}</button>
                {others.length > 0 && (
                  <button type="button" className="label text-label hover:underline disabled:opacity-40" disabled={!matches.length} onClick={() => setList(true)}>{t("deck.matchesSoFar", { n: matches.length })} →</button>
                )}
              </div>
              <p className="text-sm text-paper-dim">{others.length && !matches.length && swiped > 0 ? t("link.noMatchYet") : t("link.shareHint")}</p>
            </div>
          }
        />
      )}
      {matchCard && <MatchOverlay card={matchCard} onKeepGoing={() => setShowing(null)} onSettle={() => { setShowing(null); setList(true); }} />}
    </>
  );
}
