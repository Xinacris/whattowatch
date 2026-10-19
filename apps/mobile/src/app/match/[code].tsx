import { useEffect, useMemo, useState } from "react";
import { Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { listNames, normalizeRoomCode, shortlist, type TitleKey, type Vote } from "@wtw/core";
import { DeckView } from "@/components/deck-view";
import { MatchSheet } from "@/components/match-sheet";
import { NameGate } from "@/components/name-gate";
import { Shortlist } from "@/components/shortlist";
import { Btn, Notice } from "@/components/ui";
import { api } from "@/lib/api";
import { deck } from "@/lib/deck";
import { API_URL } from "@/lib/env";
import { useCards, useRoom, useViewer } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { colors, fontSize, s, space } from "@/lib/theme";

const COPY = { not_found: "room.notFound", bad_code: "room.notFound", expired: "room.expired", full: "room.full", live_unavailable: "setup.liveDown", network: "room.offline" } as const;

export default function Room() {
  const { t, lang } = usePrefs();
  const params = useLocalSearchParams<{ code: string }>();
  const code = normalizeRoomCode(params.code ?? "");
  const [viewer, setViewer] = useViewer();
  const { view, first, fatal, offline, apply, fail } = useRoom(code ?? "", code ? viewer : null);
  const [stage, setStage] = useState<"lobby" | "deck" | "shortlist">("lobby");
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => { if (first) deck.start(first.filters, first.seed, lang, first.mine); }, [first, lang]);
  const baseline = useMemo(() => new Set(first?.matches.map((m) => m.key) ?? []), [first]);
  const ranked = useMemo(() => shortlist(view?.matches ?? []), [view]);
  const cards = useCards(ranked);
  const showing = view?.matches.find((m) => !baseline.has(m.key) && !dismissed.has(m.key))?.key ?? null;
  const matchCard = cards.find((c) => c.key === showing) ?? null;

  if (!code || fatal) return <View style={s.screen}><Notice title={t(COPY[fatal ?? "bad_code"])} action={<Btn tone="label" title={t("landing.start")} onPress={() => router.replace("/new")} />} /></View>;
  if (!viewer) return <View style={s.screen} />;
  if (!viewer.name) return <View style={s.screen}><NameGate title={t("join.title", { code })} initial="" onDone={(name) => setViewer({ ...viewer, name })} /></View>;
  if (!view) return <View style={s.screen}><Text style={[s.label, { padding: space[6] }]}>{t("common.loading")}</Text></View>;

  const send = (key: string, vote: Vote | null) => void api.vote(code, viewer, key as TitleKey, vote).then(apply, fail);
  const others = view.members.filter((m) => m.id !== viewer.id).map((m) => m.name);
  const current = stage === "lobby" && first && Object.keys(first.mine).length ? "deck" : stage;
  const dismiss = () => showing && setDismissed((d) => new Set([...d, showing]));

  return (
    <View style={s.screen}>
      {offline && <Text style={[s.label, { backgroundColor: colors.nope, color: colors.labelInk, padding: space[2], textAlign: "center" }]}>{t("room.offline")}</Text>}
      {current === "lobby" && (
        <View style={s.pad}>
          <Text style={s.label}>{t("lobby.code")}</Text>
          <Text style={[s.display, { fontSize: 72, letterSpacing: 6, color: colors.label }]}>{code}</Text>
          <Btn title={t("lobby.copy")} onPress={() => void Share.share({ message: `${API_URL}/match/${code}` })} />
          <Text style={[s.display, { fontSize: fontSize.xl }]}>{t("lobby.here")}</Text>
          {view.members.map((m) => <Text key={m.id} style={[s.tape, s.display, { fontSize: fontSize.lg, padding: space[2] }]}>{m.name}{m.id === viewer.id ? `  (${t("lobby.you")})` : ""}</Text>)}
          {view.members.length < 2 && <Text style={[s.body, s.dim]}>{t("lobby.waiting")}</Text>}
          <Btn tone="label" title={`${t("lobby.start")} →`} disabled={view.members.length < 2} onPress={() => setStage("deck")} />
        </View>
      )}
      {current === "deck" && (
        <DeckView onVote={send} onUndo={(k) => send(k, null)} onLoosen={() => router.replace("/new")}
          exhausted={others.length > 0 && <Text style={[s.body, s.dim]}>{t("room.waitingOn", { names: listNames(lang, others) })}</Text>}
          footer={<Btn title={`${t("deck.matchesSoFar", { n: ranked.length })} →`} disabled={!ranked.length} onPress={() => setStage("shortlist")} />} />
      )}
      {current === "shortlist" && <Shortlist cards={cards} onBack={() => setStage("deck")} onNew={() => router.replace("/new")} />}
      {matchCard && <MatchSheet card={matchCard} onKeepGoing={() => { dismiss(); setStage("deck"); }} onSettle={() => { dismiss(); setStage("shortlist"); }} />}
    </View>
  );
}
