"use client";
import Link from "next/link";
import { useState } from "react";
import { linkStage, listNames, matchesFromVoters, voterLabels, type LinkPayload } from "@wtw/core";
import { Notice, useT, usePrefs } from "@wtw/ui";
import { votedHere } from "@/lib/link-progress";
import { getViewer, setViewerName } from "@/lib/viewer";
import { LinkFriend, swapTo } from "./link-friend";
import { LinkInitiator } from "./link-initiator";
import { NameGate } from "./name-input";
import { ResultsScreen } from "./results-screen";
import { ShareScreen } from "./share-screen";

export function LinkRoom({ payload }: { payload: LinkPayload }) {
  const t = useT();
  const { lang } = usePrefs();
  const [name, setName] = useState<string | null>(() => getViewer().name || null);
  const [draft, setDraft] = useState(() => getViewer().name);
  const [stage] = useState(() => linkStage(payload, votedHere(payload.seed)));
  const names = voterLabels(payload.voters.map((v) => v.name));
  const needsName = (stage === "start" || stage === "swipe") && !name;

  if (needsName) {
    const title = stage === "swipe" ? t("link.yourTurn", { names: listNames(lang, names) }) : t("setup.title");
    return <NameGate title={title} value={draft} onChange={setDraft} onSubmit={() => { setViewerName(draft); setName(draft.trim()); }} />;
  }
  switch (stage) {
    case "start":
      return <LinkInitiator payload={payload} name={name ?? ""} />;
    case "swipe":
      return (
        <>
          <p className="label mx-auto max-w-md px-4 pt-6 text-label">{t("link.yourTurn", { names: listNames(lang, names) })}</p>
          <LinkFriend payload={payload} name={name ?? ""} />
        </>
      );
    case "waiting":
      return (
        <>
          <Notice title={t("waiting.title")} body={t("waiting.body")} />
          <div className="-mt-16"><ShareScreen liked={null} url={window.location.href} /></div>
        </>
      );
    case "results":
      return <ResultsScreen results={matchesFromVoters(payload.deck, payload.voters)} names={names} addPerson={payload.finished ? null : window.location.href} onSwap={swapTo(payload)} />;
    case "solo":
      return <Notice title={t("results.solo")} action={<Link href="/match/new" className="btn btn-label">{t("landing.start")} →</Link>} />;
  }
}
