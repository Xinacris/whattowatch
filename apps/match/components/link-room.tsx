"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { linkStage, listNames, sameVoter, voterLabels, withoutVoter, type LinkPayload } from "@wtw/core";
import { Notice, useT, usePrefs } from "@wtw/ui";
import { forgetVote, votedHere } from "@/lib/link-progress";
import { useLinkResults } from "@/lib/use-link-results";
import { getViewer, setViewerName } from "@/lib/viewer";
import { LinkFriend, swapTo } from "./link-friend";
import { LinkInitiator } from "./link-initiator";
import { NameGate } from "./name-input";
import { clearPassed, PassPhone, passedPhone } from "./pass-phone";
import { ResultsScreen } from "./results-screen";
import { ShareScreen } from "./share-screen";

/** null: whoever's name we remember. "who": the phone was passed, ask. `already`: that name swiped this link here before. */
type Gate = null | "who" | { already: string };

export function LinkRoom({ payload: original }: { payload: LinkPayload }) {
  const t = useT();
  const { lang } = usePrefs();
  const [payload, setPayload] = useState(original); // "swipe again" takes your earlier picks out
  const [name, setName] = useState<string | null>(() => getViewer().name || null);
  const [draft, setDraft] = useState(() => (passedPhone() ? "" : getViewer().name));
  const [stage, setStage] = useState(() => linkStage(original, name !== null && votedHere(original.seed, name)));
  const [gate, setGate] = useState<Gate>(() => (passedPhone() ? "who" : null));
  const names = voterLabels(payload.voters.map((v) => v.name));

  function sitDown(typed: string) {
    const who = typed.trim();
    clearPassed();
    setViewerName(who);
    setName(who);
    const voted = votedHere(payload.seed, who);
    setGate(voted && !payload.finished ? { already: who } : null);
    setStage(linkStage(payload, voted));
  }
  function swipeAgain(who: string) {
    forgetVote(payload.seed, who);
    const next = { ...payload, voters: withoutVoter(payload.voters, who) };
    setPayload(next);
    setGate(null);
    setStage(linkStage(next, false));
  }

  if (gate !== null && gate !== "who") {
    return (
      <Notice
        title={t("link.already", { name: gate.already })}
        action={
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-label" onClick={() => swipeAgain(gate.already)} data-testid="swipe-again">{t("link.again", { name: gate.already })} →</button>
            <button type="button" className="btn btn-ghost" onClick={() => setGate(null)}>{t("common.back")}</button>
          </div>
        }
      />
    );
  }
  if (gate === "who" || ((stage === "start" || stage === "swipe") && !name)) {
    const title = gate === "who" ? t("link.whoNow") : stage === "swipe" ? t("link.yourTurn", { names: listNames(lang, names) }) : t("setup.title");
    return <NameGate title={title} value={draft} onChange={setDraft} onSubmit={() => sitDown(draft)} />;
  }
  const passPhone = <PassPhone onClick={() => { setDraft(""); setGate("who"); }} />;
  switch (stage) {
    case "start":
      return <LinkInitiator key={name} payload={payload} name={name ?? ""} />;
    case "swipe":
      return <LinkFriend key={name} payload={payload} name={name ?? ""} intro={t("link.yourTurn", { names: listNames(lang, names) })} />;
    case "waiting":
      return <ShareScreen title={t("waiting.title")} line={t("waiting.body")} url={window.location.href}>{passPhone}</ShareScreen>;
    case "results":
      return <LinkResults payload={payload} names={names} me={payload.voters.findIndex((v) => sameVoter(v.name, name ?? ""))} passPhone={payload.finished ? null : passPhone} />;
    case "solo":
      return <Notice title={t("results.solo")} action={<Link href="/match/new" className="btn btn-label">{t("landing.start")} →</Link>} />;
  }
}

function LinkResults({ payload, names, me, passPhone }: { payload: LinkPayload; names: string[]; me: number; passPhone: ReactNode }) {
  const results = useLinkResults(payload.deck, payload.voters);
  return (
    <>
      <ResultsScreen results={results} names={names} me={me} addPerson={payload.finished ? null : window.location.href} onSwap={swapTo(payload)} />
      {passPhone && <div className="mx-auto flex max-w-4xl px-4 pb-12 sm:px-6">{passPhone}</div>}
    </>
  );
}
