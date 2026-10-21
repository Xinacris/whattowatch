import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { decodeLink, linkStage, listNames, voterLabels, withoutVoter, type LinkPayload, type LinkStage } from "@wtw/core";
import { Friend, Initiator, PassPhone, swap } from "@/components/link-flows";
import { NameGate } from "@/components/name-gate";
import { ResultsView } from "@/components/results-view";
import { ShareView } from "@/components/share-view";
import { Btn, Notice } from "@/components/ui";
import { API_URL } from "@/lib/env";
import { useLinkResults, useViewer } from "@/lib/hooks";
import { forgetVote, votedHere } from "@/lib/link-store";
import { usePrefs } from "@/lib/prefs";
import { colors, s, space } from "@/lib/theme";

/** null: whoever's name we remember. "who": the phone was passed, ask. `already`: that name swiped this link here before. */
type Gate = null | "who" | { already: string };

export default function LinkRoom() {
  const { t, lang } = usePrefs();
  const { d, pass } = useLocalSearchParams<{ d: string; pass?: string }>();
  const decoded = useMemo(() => (d ? decodeLink(d) : null), [d]);
  const [payload, setPayload] = useState<LinkPayload | null>(decoded); // "swipe again" takes your earlier picks out
  const [viewer, setViewer] = useViewer();
  const [stage, setStage] = useState<LinkStage | null>(null);
  const [gate, setGate] = useState<Gate>(pass ? "who" : null);
  useEffect(() => { setPayload(decoded); setGate(pass ? "who" : null); }, [decoded, pass]);
  useEffect(() => { // once, for whoever this phone remembers; after that sitDown() decides
    if (!decoded || !viewer || stage) return;
    if (pass || !viewer.name) setStage(linkStage(decoded, false));
    else void votedHere(decoded.seed, viewer.name, viewer.name).then((v) => setStage(linkStage(decoded, v)));
  }, [decoded, viewer, pass, stage]);

  const newNight = <Btn tone="label" title={t("landing.start")} onPress={() => router.replace("/new")} />;
  if (!payload) return <View style={s.screen}><Notice title={t("link.broken")} action={newNight} /></View>;
  if (!viewer || !stage) return <View style={s.screen} />;
  const names = voterLabels(payload.voters.map((v) => v.name));
  const p = payload;

  async function sitDown(name: string) {
    const voted = await votedHere(p.seed, name, viewer?.name ?? "");
    setViewer({ ...viewer!, name });
    setGate(voted && !p.finished ? { already: name } : null);
    setStage(linkStage(p, voted));
  }
  async function swipeAgain(name: string) {
    await forgetVote(p.seed, name);
    const next = { ...p, voters: withoutVoter(p.voters, name) };
    setPayload(next);
    setGate(null);
    setStage(linkStage(next, false));
  }

  if (gate !== null && gate !== "who") {
    return (
      <View style={s.screen}>
        <Notice title={t("link.already", { name: gate.already })} action={<>
          <Btn tone="label" title={`${t("link.again", { name: gate.already })} →`} onPress={() => void swipeAgain(gate.already)} testID="swipe-again" />
          <Btn title={t("common.back")} onPress={() => setGate(null)} />
        </>} />
      </View>
    );
  }
  if (gate === "who" || ((stage === "start" || stage === "swipe") && !viewer.name)) {
    const title = gate === "who" ? t("link.whoNow") : stage === "swipe" ? t("link.yourTurn", { names: listNames(lang, names) }) : t("setup.title");
    return <View style={s.screen}><NameGate key={String(gate)} title={title} initial="" onDone={(n) => void sitDown(n)} /></View>;
  }
  const here = `${API_URL}/match/link?d=${d}`;
  const passPhone = <PassPhone before={async () => setGate("who")} />;
  return (
    <View style={s.screen}>
      {stage === "start" && <Initiator key={viewer.name} payload={payload} name={viewer.name} />}
      {stage === "swipe" && <Text style={[s.label, { color: colors.label, paddingHorizontal: space[4], paddingTop: space[3] }]}>{t("link.yourTurn", { names: listNames(lang, names) })}</Text>}
      {stage === "swipe" && <Friend key={viewer.name} payload={payload} name={viewer.name} />}
      {stage === "waiting" && <ShareView title={t("waiting.title")} line={t("waiting.body")} url={here}>{passPhone}</ShareView>}
      {stage === "results" && <LinkResults payload={payload} names={names} here={here} footer={payload.finished ? null : passPhone} />}
      {stage === "solo" && <Notice title={t("results.solo")} action={newNight} />}
    </View>
  );
}

function LinkResults({ payload, names, here, footer }: { payload: LinkPayload; names: string[]; here: string; footer: ReactNode }) {
  const results = useLinkResults(payload.deck, payload.voters);
  return <ResultsView results={results} names={names} addPerson={payload.finished ? null : here} onSwap={swap(payload)} onLoosen={() => router.replace("/new")} footer={footer} />;
}
