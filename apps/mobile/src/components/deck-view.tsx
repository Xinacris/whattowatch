import { useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { remaining, type Vote } from "@wtw/core";
import { deck, useDeck } from "@/lib/deck";
import { usePrefs } from "@/lib/prefs";
import { colors, fontSize, s, space } from "@/lib/theme";
import { CardFace } from "./card-face";
import { SwipeCard, type SwipeHandle } from "./swipe-card";
import { Btn, Sticker } from "./ui";

export function DeckView({ onVote, onUndo, header, banner, exhausted, onLoosen }: { onVote(key: string, vote: Vote): void; onUndo(key: string): void; header?: ReactNode; banner?: string | null; exhausted?: ReactNode; onLoosen(): void }) {
  const { t } = usePrefs();
  const state = useDeck();
  const left = remaining(state);
  const top = left[0];
  const card = useRef<SwipeHandle>(null);
  const [flipped, setFlipped] = useState(false);
  const still = useSharedValue(0);

  const commit = (vote: Vote) => { const sw = deck.swipe(vote); setFlipped(false); if (sw) onVote(sw.key, sw.vote); };
  const undo = () => { const sw = deck.undo(); if (sw) onUndo(sw.key); };

  return (
    <View style={{ flex: 1, padding: space[4], gap: space[3] }}>
      {header}
      {banner && <Sticker text={banner} rotate={-1} />}
      <View style={{ flex: 1 }}>
        {left[1] && <View style={{ position: "absolute", inset: 0, opacity: 0.6, transform: [{ rotate: "2deg" }, { scale: 0.96 }] }} pointerEvents="none"><CardFace card={left[1]} flipped={false} x={still} y={still} /></View>}
        {top ? (
          <SwipeCard key={top.key} ref={card} onCommit={commit} onTap={() => setFlipped((f) => !f)}>
            {(x, y) => <CardFace card={top} flipped={flipped} x={x} y={y} />}
          </SwipeCard>
        ) : (
          <View style={[s.tape, { flex: 1, justifyContent: "center", padding: space[5], gap: space[4] }]}>
            {state.error ? (
              <><Text style={[s.display, { fontSize: fontSize["2xl"] }]}>{t("common.error")}</Text><Btn tone="label" title={t("common.retry")} onPress={() => void deck.fetchMore()} /></>
            ) : state.loading || !state.done ? (
              <><ActivityIndicator color={colors.label} /><Text style={s.label}>{t("deck.loadingMore")}</Text></>
            ) : (
              <><Text style={[s.display, { fontSize: fontSize["2xl"] }]}>{t("deck.empty")}</Text>{exhausted}<Btn title={t("deck.loosen")} onPress={onLoosen} /></>
            )}
          </View>
        )}
      </View>
      <View style={s.row}>
        <Btn tone="nope" title={`← ${t("deck.nope")}`} disabled={!top} onPress={() => card.current?.fling("nope")} style={{ flex: 1 }} />
        <Btn title={`↑ ${t("deck.seen")}`} disabled={!top} onPress={() => card.current?.fling("seen")} />
        <Btn tone="label" title={`${t("deck.like")} →`} disabled={!top} onPress={() => card.current?.fling("like")} style={{ flex: 1 }} />
      </View>
      <Btn title={`↶ ${t("deck.undo")}`} disabled={!state.last} onPress={undo} style={{ borderWidth: 0, alignSelf: "flex-start", paddingHorizontal: 0, paddingVertical: 4 }} />
    </View>
  );
}
