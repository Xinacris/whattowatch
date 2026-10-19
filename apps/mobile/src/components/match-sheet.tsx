import { Image, Linking, Modal, ScrollView, Text, View } from "react-native";
import { formatRuntime, type DeckCard } from "@wtw/core";
import { API_URL } from "@/lib/env";
import { usePrefs } from "@/lib/prefs";
import { colors, fontSize, s, space } from "@/lib/theme";
import { Btn, Sticker } from "./ui";

export function MatchSheet({ card, onKeepGoing, onSettle }: { card: DeckCard; onKeepGoing(): void; onSettle(): void }) {
  const { t } = usePrefs();
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onKeepGoing}>
      <ScrollView style={{ backgroundColor: colors.shelf }} contentContainerStyle={[s.pad, { paddingTop: 72 }]}>
        <Text style={[s.display, { fontSize: fontSize["4xl"], color: colors.label }]}>{t("match.title")}</Text>
        <View style={[s.row, { alignItems: "flex-start", gap: space[4] }]}>
          {card.poster && <Image source={{ uri: card.poster }} style={{ width: 120, aspectRatio: 2 / 3, borderWidth: 2, borderColor: colors.paper, transform: [{ rotate: "-2deg" }] }} />}
          <View style={{ flex: 1, gap: space[2] }}>
            <Sticker text={t("match.everyone")} />
            <Text style={[s.display, { fontSize: fontSize["2xl"] }]}>{card.title}</Text>
            <Text style={s.label}>{[card.year, formatRuntime(card.runtime), ...card.genreNames].filter(Boolean).join("  ·  ")}</Text>
          </View>
        </View>
        {card.providers.length > 0 && <Text style={s.label}>{t("match.watchOn")}</Text>}
        <View style={s.wrap}>
          {card.providers.map((p) => (
            <View key={p.id} style={[s.row, s.tape, { paddingRight: 10 }]}>
              {p.logo && <Image source={{ uri: p.logo }} style={{ width: 28, height: 28 }} />}
              <Text style={s.body}>{p.name}</Text>
            </View>
          ))}
        </View>
        <Btn tone="label" title={t("match.settle")} onPress={onSettle} />
        <Btn title={t("match.keepGoing")} onPress={onKeepGoing} />
        <Btn title={`${t("match.details")} ↗`} onPress={() => void Linking.openURL(`${API_URL}/title/${card.type}/${card.id}`)} />
      </ScrollView>
    </Modal>
  );
}
