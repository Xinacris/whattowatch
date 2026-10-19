import { Image, Linking, ScrollView, Share, Text, View } from "react-native";
import { formatRating, formatRuntime, listNames, type DeckCard, type TitleKey } from "@wtw/core";
import { API_URL } from "@/lib/env";
import { useCards } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { colors, fontSize, s, space } from "@/lib/theme";
import { Btn } from "./ui";

interface Props { results: TitleKey[]; names: string[]; sendBack?: string | null; addPerson?: string | null; onSwap?: (() => void) | null; onLoosen(): void }

export function ResultsView({ results, names, sendBack, addPerson, onSwap, onLoosen }: Props) {
  const { t, lang } = usePrefs();
  const cards = useCards(results);
  const zero = results.length === 0;
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={[s.display, { fontSize: fontSize["4xl"], color: colors.label }]}>{zero ? t("results.zero") : t(names.length > 2 ? "results.titleMany" : "results.title")}</Text>
      <Text style={s.label}>{t("results.who", { names: listNames(lang, names) })}</Text>
      {zero && <Text style={s.body}>{t("results.zeroBody")}</Text>}
      {!zero && cards.length < results.length && <Text style={[s.label, s.dim]}>{t("results.loading")}</Text>}
      {cards.map((c, i) => <ResultCard key={c.key} card={c} rank={i + 1} />)}
      {zero && onSwap && <Btn tone="label" title={`${t("results.swap")} →`} onPress={onSwap} />}
      {zero && <Btn title={t("deck.loosen")} onPress={onLoosen} />}
      {sendBack && <Btn tone={zero ? "ghost" : "label"} title={t("results.sendBack")} onPress={() => void Share.share({ message: sendBack })} />}
      {addPerson && <Btn title={t("results.addPerson")} onPress={() => void Share.share({ message: addPerson })} />}
    </ScrollView>
  );
}

function ResultCard({ card, rank }: { card: DeckCard; rank: number }) {
  const { t, region } = usePrefs();
  const meta = [card.year, formatRuntime(card.runtime), formatRating(card.rating) && `${formatRating(card.rating)}/10`].filter(Boolean).join("  ·  ");
  return (
    <View style={[s.tape, s.row, { alignItems: "flex-start", padding: space[3], gap: space[3] }]}>
      {card.poster ? <Image source={{ uri: card.poster }} style={{ width: 96, aspectRatio: 2 / 3 }} /> : <View style={{ width: 96, aspectRatio: 2 / 3, backgroundColor: colors.shelfHigh }} />}
      <View style={{ flex: 1, gap: space[2] }}>
        <Text style={[s.display, { fontSize: fontSize["2xl"], color: colors.label }]}>{rank}</Text>
        <Text style={[s.display, { fontSize: fontSize.xl }]}>{card.title}</Text>
        <Text style={s.label}>{meta}</Text>
        {card.providers.length === 0 && <Text style={[s.body, s.dim]}>{t("results.notStreaming", { region })}</Text>}
        <View style={s.wrap}>
          {card.providers.map((p) => p.logo && <Image key={p.id} source={{ uri: p.logo }} accessibilityLabel={p.name} style={{ width: 28, height: 28 }} />)}
        </View>
        <Btn tone="label" title={`${t("results.where")} →`} onPress={() => void Linking.openURL(`${API_URL}/title/${card.type}/${card.id}`)} />
      </View>
    </View>
  );
}
