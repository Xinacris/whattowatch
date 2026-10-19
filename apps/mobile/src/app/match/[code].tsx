import { useEffect, useState } from "react";
import { Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { likesNeeded, listNames, normalizeRoomCode, ROUND_EXTRA, ROUND_FIRST, type RoomView, type TitleKey, type Vote } from "@wtw/core";
import { DeckView } from "@/components/deck-view";
import { NameGate } from "@/components/name-gate";
import { ResultsView } from "@/components/results-view";
import { RoundCounter } from "@/components/round-counter";
import { Btn, Notice } from "@/components/ui";
import { api } from "@/lib/api";
import { deck, useDeck } from "@/lib/deck";
import { API_URL } from "@/lib/env";
import { useRoom, useViewer } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { colors, fontSize, s, space } from "@/lib/theme";

const COPY = { not_found: "room.notFound", bad_code: "room.notFound", expired: "room.expired", full: "room.full", live_unavailable: "setup.liveDown", network: "room.offline" } as const;

type Stage = "lobby" | "deck" | "waiting" | "results";
function stageOf(view: RoomView, started: boolean, votes: Record<string, Vote>): Stage {
  if (view.done) return "results";
  if (!started) return "lobby";
  return view.deck.every((k) => votes[k]) ? "waiting" : "deck";
}

export default function Room() {
  const { t, lang } = usePrefs();
  const params = useLocalSearchParams<{ code: string }>();
  const code = normalizeRoomCode(params.code ?? "");
  const [viewer, setViewer] = useViewer();
  const { view, first, fatal, offline, apply, fail } = useRoom(code ?? "", code ? viewer : null);
  const [started, setStarted] = useState(false);
  const { votes } = useDeck();

  useEffect(() => { if (first) deck.start(first.filters, first.seed, lang, first.mine, { keys: first.deck }); }, [first, lang]);
  useEffect(() => { if (view) deck.setKeys(view.deck); }, [view]);

  if (!code || fatal) return <View style={s.screen}><Notice title={t(COPY[fatal ?? "bad_code"])} action={<Btn tone="label" title={t("landing.start")} onPress={() => router.replace("/new")} />} /></View>;
  if (!viewer) return <View style={s.screen} />;
  if (!viewer.name) return <View style={s.screen}><NameGate title={t("join.title", { code })} initial="" onDone={(name) => setViewer({ ...viewer, name })} /></View>;
  if (!view) return <View style={s.screen}><Text style={[s.label, { padding: space[6] }]}>{t("common.loading")}</Text></View>;

  const send = (key: string, vote: Vote | null) => void api.vote(code, viewer, key as TitleKey, vote).then(apply, fail);
  const mine = view.deck.map((k) => votes[k]);
  const swiped = mine.filter(Boolean).length;
  const seen = mine.filter((v) => v === "seen").length;
  const grew = view.deck.length > ROUND_FIRST && swiped === view.deck.length - ROUND_EXTRA;
  const stage = stageOf(view, started || Boolean(first && Object.keys(first.mine).length), votes);

  return (
    <View style={s.screen}>
      {offline && <Text style={[s.label, { backgroundColor: colors.nope, color: colors.labelInk, padding: space[2], textAlign: "center" }]}>{t("room.offline")}</Text>}
      {stage === "lobby" && (
        <View style={s.pad}>
          <Text style={s.label}>{t("lobby.code")}</Text>
          <Text style={[s.display, { fontSize: 72, letterSpacing: 6, color: colors.label }]}>{code}</Text>
          <Btn title={t("lobby.copy")} onPress={() => void Share.share({ message: `${API_URL}/match/${code}` })} />
          <Text style={[s.display, { fontSize: fontSize.xl }]}>{t("lobby.here")}</Text>
          {view.members.map((m) => <Text key={m.id} style={[s.tape, s.display, { fontSize: fontSize.lg, padding: space[2] }]}>{m.name}{m.id === viewer.id ? `  (${t("lobby.you")})` : ""}</Text>)}
          {view.members.length < 2 && <Text style={[s.body, s.dim]}>{t("lobby.waiting")}</Text>}
          <Btn tone="label" title={`${t("lobby.start")} →`} disabled={view.members.length < 2} onPress={() => setStarted(true)} />
        </View>
      )}
      {stage === "deck" && (
        <DeckView onVote={send} onUndo={(k) => send(k, null)} onLoosen={() => router.replace("/new")} banner={grew ? t("round.roomMore") : null}
          header={<RoundCounter liked={mine.filter((v) => v === "like").length} need={likesNeeded(view.deck.length - seen)} card={Math.min(swiped + 1, view.deck.length)} of={view.deck.length} />} />
      )}
      {stage === "waiting" && <Notice title={t("room.through")} body={view.waitingOn.length ? t("room.waitingFor", { names: listNames(lang, view.waitingOn) }) : t("common.loading")} />}
      {stage === "results" && <ResultsView results={view.results ?? []} names={view.members.map((m) => m.name)} onLoosen={() => router.replace("/new")} />}
    </View>
  );
}
