import { Image, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { formatRating, formatRuntime, type DeckCard } from "@wtw/core";
import { usePrefs } from "@/lib/prefs";
import { colors, font, fontSize, s } from "@/lib/theme";

function Stamp({ text, tone, x, y, side }: { text: string; tone: string; x: SharedValue<number>; y: SharedValue<number>; side: "like" | "nope" | "seen" }) {
  const style = useAnimatedStyle(() => {
    const o = side === "like" ? x.value / 110 : side === "nope" ? -x.value / 110 : Math.abs(y.value) > Math.abs(x.value) ? -y.value / 110 : 0;
    return { opacity: Math.min(1, Math.max(0, o)) };
  });
  const pos = side === "like" ? { top: 24, left: 20, transform: [{ rotate: "-12deg" }] } : side === "nope" ? { top: 24, right: 20, transform: [{ rotate: "12deg" }] } : { bottom: 140, alignSelf: "center" as const };
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", zIndex: 10, borderWidth: 4, borderColor: tone, paddingHorizontal: 10 }, pos, style]}>
      <Text style={{ fontFamily: font.display, fontSize: fontSize["2xl"], color: tone, textTransform: "uppercase" }}>{text}</Text>
    </Animated.View>
  );
}

export function CardFace({ card, flipped, x, y }: { card: DeckCard; flipped: boolean; x: SharedValue<number>; y: SharedValue<number> }) {
  const { t } = usePrefs();
  const meta = [card.year, formatRuntime(card.runtime), formatRating(card.rating) && `★ ${formatRating(card.rating)}`].filter(Boolean).join("  ·  ");
  return (
    <View style={{ flex: 1, borderWidth: 2, borderColor: colors.paper, backgroundColor: colors.shelfRaised, overflow: "hidden" }}>
      <Stamp text={t("deck.like")} tone={colors.label} x={x} y={y} side="like" />
      <Stamp text={t("deck.nope")} tone={colors.nope} x={x} y={y} side="nope" />
      <Stamp text={t("deck.seen")} tone={colors.paper} x={x} y={y} side="seen" />
      {flipped ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text style={s.label}>{meta}</Text>
          <Text style={[s.display, { fontSize: fontSize["2xl"] }]}>{card.title}</Text>
          <Text style={s.body}>{card.overview || t("deck.noPlot")}</Text>
          {card.cast.length > 0 && <Text style={[s.body, s.dim]}>{t("deck.starring")}: {card.cast.join(", ")}</Text>}
        </ScrollView>
      ) : card.poster ? (
        <Image source={{ uri: card.poster }} style={{ flex: 1 }} resizeMode="cover" accessibilityLabel={card.title} />
      ) : (
        <View style={{ flex: 1, justifyContent: "space-between", padding: 16, backgroundColor: colors.shelfHigh }}>
          <Text style={s.label}>{t("common.noPoster")}</Text>
          <Text style={[s.display, { fontSize: fontSize["3xl"] }]}>{card.title}</Text>
        </View>
      )}
      <View style={{ borderTopWidth: 2, borderTopColor: colors.paper, backgroundColor: colors.shelf, padding: 12, gap: 6 }}>
        <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
          <Text numberOfLines={2} style={[s.display, { fontSize: fontSize.xl, flex: 1 }]}>{card.title}</Text>
          <View style={s.row}>{card.providers.slice(0, 3).map((p) => p.logo && <Image key={p.id} source={{ uri: p.logo }} style={{ width: 26, height: 26 }} accessibilityLabel={p.name} />)}</View>
        </View>
        <Text style={s.label}>{[meta, ...card.genreNames].filter(Boolean).join("  ·  ")}</Text>
        <Text style={[s.label, { color: colors.seen, fontSize: 10 }]}>{flipped ? t("deck.flipBack") : t("deck.flip")}</Text>
      </View>
    </View>
  );
}
