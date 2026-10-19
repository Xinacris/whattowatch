import { useEffect, useMemo, useState } from "react";
import { Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { decodeLink, encodeLink, linkMatches, listNames, type LinkVoter, type TitleKey } from "@wtw/core";
import { DeckView } from "@/components/deck-view";
import { MatchSheet } from "@/components/match-sheet";
import { NameGate } from "@/components/name-gate";
import { Shortlist } from "@/components/shortlist";
import { Btn, Notice } from "@/components/ui";
import { deck, useDeck } from "@/lib/deck";
import { API_URL } from "@/lib/env";
import { useCards, useViewer } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { colors, s, space } from "@/lib/theme";

const same = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

export default function LinkRoom() {
  const { t, lang } = usePrefs();
  const { d } = useLocalSearchParams<{ d: string }>();
  const payload = useMemo(() => (d ? decodeLink(d) : null), [d]);
  const [viewer, setViewer] = useViewer();
  const { votes, cards: loaded } = useDeck();
  const [showing, setShowing] = useState<TitleKey | null>(null);
  const [list, setList] = useState(false);

  useEffect(() => { if (payload && viewer?.name) deck.start(payload.filters, payload.seed, lang); }, [payload, viewer?.name, lang]);
  const name = viewer?.name ?? "";
  const others = useMemo(() => payload?.voters.filter((v) => !same(v.name, name)) ?? [], [payload, name]);
  const me: LinkVoter = useMemo(() => ({
    name,
    likes: Object.entries(votes).filter(([, v]) => v === "like").map(([k]) => k as TitleKey),
    seen: Object.entries(votes).filter(([, v]) => v === "seen").map(([k]) => k as TitleKey),
  }), [votes, name]);
  const matches = useMemo(() => (others.length ? linkMatches([...others, me], loaded.map((c) => c.key)) : []), [others, me, loaded]);
  const cards = useCards(matches);
  const matchCard = cards.find((c) => c.key === showing) ?? null;

  if (!payload) return <View style={s.screen}><Notice title={t("link.broken")} action={<Btn tone="label" title={t("landing.start")} onPress={() => router.replace("/new")} />} /></View>;
  if (!viewer) return <View style={s.screen} />;
  const names = listNames(lang, others.map((o) => o.name));
  if (!viewer.name) return <View style={s.screen}><NameGate title={others.length ? t("link.yourTurn", { names }) : t("setup.title")} initial="" onDone={(n) => setViewer({ ...viewer, name: n })} /></View>;

  const share = () => void Share.share({ message: `${API_URL}/match/link?d=${encodeLink({ ...payload, voters: [...others, me] })}` });
  const onVote = (key: string, vote: string) => {
    if (vote !== "like" || !others.length) return;
    if (linkMatches([...others, { ...me, likes: [...me.likes, key as TitleKey] }]).includes(key as TitleKey)) setShowing(key as TitleKey);
  };

  return (
    <View style={s.screen}>
      {others.length > 0 && <Text style={[s.label, { color: colors.label, paddingHorizontal: space[4], paddingTop: space[3] }]}>{t("link.yourTurn", { names })}</Text>}
      {list ? <Shortlist cards={cards} onBack={() => setList(false)} onNew={() => router.replace("/new")} /> : (
        <DeckView onVote={onVote} onUndo={() => {}} onLoosen={() => router.replace("/new")}
          exhausted={<Text style={[s.body, s.dim]}>{t("link.done")}</Text>}
          footer={
            <View style={s.row}>
              <Btn tone="label" title={t("link.share")} disabled={!Object.keys(votes).length} onPress={share} style={{ flex: 1 }} />
              {others.length > 0 && <Btn title={t("deck.matchesSoFar", { n: matches.length })} disabled={!matches.length} onPress={() => setList(true)} />}
            </View>
          } />
      )}
      {matchCard && <MatchSheet card={matchCard} onKeepGoing={() => setShowing(null)} onSettle={() => { setShowing(null); setList(true); }} />}
    </View>
  );
}
