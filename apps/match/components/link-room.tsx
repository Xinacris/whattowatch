"use client";
import Link from "next/link";
import { useState } from "react";
import { linkStage, listNames, voterLabels, type LinkPayload } from "@wtw/core";
import { Notice, useT, usePrefs } from "@wtw/ui";
import { votedHere } from "@/lib/link-progress";
import { useLinkResults } from "@/lib/use-link-results";
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
      return <LinkFriend payload={payload} name={name ?? ""} intro={t("link.yourTurn", { names: listNames(lang, names) })} />;
    case "waiting":
      return <ShareScreen title={t("waiting.title")} line={t("waiting.body")} url={window.location.href} />;
    case "results":
      return <LinkResults payload={payload} names={names} />;
    case "solo":
      return <Notice title={t("results.solo")} action={<Link href="/match/new" className="btn btn-label">{t("landing.start")} →</Link>} />;
  }
}

function LinkResults({ payload, names }: { payload: LinkPayload; names: string[] }) {
  const results = useLinkResults(payload.deck, payload.voters);
  return <ResultsScreen results={results} names={names} addPerson={payload.finished ? null : window.location.href} onSwap={swapTo(payload)} />;
}
