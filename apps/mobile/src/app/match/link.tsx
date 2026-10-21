import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { decodeLink, linkStage, listNames, voterLabels, type LinkPayload, type LinkStage } from "@wtw/core";
import { Friend, Initiator, swap } from "@/components/link-flows";
import { NameGate } from "@/components/name-gate";
import { ResultsView } from "@/components/results-view";
import { ShareView } from "@/components/share-view";
import { Btn, Notice } from "@/components/ui";
import { API_URL } from "@/lib/env";
import { useLinkResults, useViewer } from "@/lib/hooks";
import { votedHere } from "@/lib/link-store";
import { usePrefs } from "@/lib/prefs";
import { colors, s, space } from "@/lib/theme";

export default function LinkRoom() {
  const { t, lang } = usePrefs();
  const { d } = useLocalSearchParams<{ d: string }>();
  const payload = useMemo(() => (d ? decodeLink(d) : null), [d]);
  const [viewer, setViewer] = useViewer();
  const [stage, setStage] = useState<LinkStage | null>(null);
  useEffect(() => { if (payload) void votedHere(payload.seed).then((v) => setStage(linkStage(payload, v))); }, [payload]);

  const newNight = <Btn tone="label" title={t("landing.start")} onPress={() => router.replace("/new")} />;
  if (!payload) return <View style={s.screen}><Notice title={t("link.broken")} action={newNight} /></View>;
  if (!viewer || !stage) return <View style={s.screen} />;
  const names = voterLabels(payload.voters.map((v) => v.name));
  if ((stage === "start" || stage === "swipe") && !viewer.name) {
    return <View style={s.screen}><NameGate title={stage === "swipe" ? t("link.yourTurn", { names: listNames(lang, names) }) : t("setup.title")} initial="" onDone={(n) => setViewer({ ...viewer, name: n })} /></View>;
  }
  const here = `${API_URL}/match/link?d=${d}`;
  return (
    <View style={s.screen}>
      {stage === "start" && <Initiator payload={payload} name={viewer.name} />}
      {stage === "swipe" && <Text style={[s.label, { color: colors.label, paddingHorizontal: space[4], paddingTop: space[3] }]}>{t("link.yourTurn", { names: listNames(lang, names) })}</Text>}
      {stage === "swipe" && <Friend payload={payload} name={viewer.name} />}
      {stage === "waiting" && <ShareView title={t("waiting.title")} line={t("waiting.body")} url={here} />}
      {stage === "results" && <LinkResults payload={payload} names={names} here={here} />}
      {stage === "solo" && <Notice title={t("results.solo")} action={newNight} />}
    </View>
  );
}

function LinkResults({ payload, names, here }: { payload: LinkPayload; names: string[]; here: string }) {
  const results = useLinkResults(payload.deck, payload.voters);
  return <ResultsView results={results} names={names} addPerson={payload.finished ? null : here} onSwap={swap(payload)} onLoosen={() => router.replace("/new")} />;
}
