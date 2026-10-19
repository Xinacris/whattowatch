import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import type { DeckCard } from "@wtw/core";
import { API_URL } from "@/lib/env";
import { usePrefs } from "@/lib/prefs";
import { colors, fontSize, s, space } from "@/lib/theme";
import { Btn } from "./ui";

export function Shortlist({ cards, onBack, onNew }: { cards: DeckCard[]; onBack(): void; onNew(): void }) {
  const { t } = usePrefs();
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={[s.display, { fontSize: fontSize["3xl"] }]}>{t("shortlist.title")}</Text>
      <Text style={s.label}>{t("shortlist.hint")}</Text>
      {cards.length === 0 && <Text style={[s.body, s.dim]}>{t("shortlist.empty")}</Text>}
      {cards.map((c, i) => (
        <Pressable key={c.key} onPress={() => void Linking.openURL(`${API_URL}/title/${c.type}/${c.id}`)} style={[s.tape, s.row, { padding: space[2], gap: space[3] }]}>
          <Text style={[s.display, { fontSize: fontSize["2xl"], color: colors.label, width: 28, textAlign: "center" }]}>{i + 1}</Text>
          {c.poster ? <Image source={{ uri: c.poster }} style={{ width: 44, aspectRatio: 2 / 3 }} /> : <View style={{ width: 44, aspectRatio: 2 / 3, backgroundColor: colors.shelfHigh }} />}
          <View style={{ flex: 1 }}>
            <Text style={[s.body, { fontFamily: undefined, fontWeight: "600" }]}>{c.title}</Text>
            <Text style={s.label}>{[c.year, ...c.genreNames].filter(Boolean).join(" · ")}</Text>
          </View>
        </Pressable>
      ))}
      <Btn title={t("match.keepGoing")} onPress={onBack} />
      <Btn title={t("shortlist.newNight")} onPress={onNew} />
    </ScrollView>
  );
}
