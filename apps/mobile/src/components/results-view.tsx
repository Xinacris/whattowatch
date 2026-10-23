import { useState, type ReactNode } from "react";
import { Image, Linking, ScrollView, Share, Text, View } from "react-native";
import { formatRating, formatRuntime, itemHref, listNames, seenByLine, seriesLabel, type DeckCard, type SharedResult } from "@wtw/core";
import { API_URL } from "@/lib/env";
import { useCards } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { colors, fontSize, s, space } from "@/lib/theme";
import { ProviderBox } from "./provider-box";
import { SeriesSticker } from "./series-face";
import { Btn } from "./ui";

/** `me` = this device's index in `names`, -1 when it didn't vote. */
interface Props { results: SharedResult[]; names: string[]; me: number; sendBack?: string | null; addPerson?: string | null; onSwap?: (() => void) | null; onLoosen(): void; footer?: ReactNode }

export function ResultsView({ results, names, me, sendBack, addPerson, onSwap, onLoosen, footer }: Props) {
  const { t, lang } = usePrefs();
  const cards = useCards(results.map((r) => r.key));
  const seen = new Map(results.map((r) => [r.key, seenByLine(lang, names, r.seenBy, me)]));
  const zero = results.length === 0;
  const [more, setMore] = useState(false); // zero overlap: two buttons up front, the rest behind "More"
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={[s.display, { fontSize: fontSize["4xl"], color: colors.label }]}>{zero ? t("results.zero") : t(names.length > 2 ? "results.titleMany" : "results.title")}</Text>
      <Text style={s.label}>{t("results.who", { names: listNames(lang, names) })}</Text>
      {zero && <Text style={s.body}>{t("results.zeroBody")}</Text>}
      {!zero && cards.length < results.length && <Text style={[s.label, s.dim]}>{t("results.loading")}</Text>}
      {cards.map((c, i) => <ResultCard key={c.key} card={c} rank={i + 1} seen={seen.get(c.key) ?? null} />)}
      {zero && onSwap && <Btn tone="label" title={`${t("results.swap")} →`} onPress={onSwap} />}
      {zero && <Btn title={t("deck.loosen")} onPress={onLoosen} />}
      {(!zero || more) && sendBack && <Btn tone={zero ? "ghost" : "label"} title={t("results.sendBack")} onPress={() => void Share.share({ message: sendBack })} />}
      {(!zero || more) && addPerson && <Btn title={t("results.addPerson")} onPress={() => void Share.share({ message: addPerson })} />}
      {zero && !more && (sendBack || addPerson) && <Btn title={t("results.more")} onPress={() => setMore(true)} style={{ borderWidth: 0, alignSelf: "flex-start", paddingHorizontal: 0 }} />}
      {footer}
    </ScrollView>
  );
}

function ResultCard({ card, rank, seen }: { card: DeckCard; rank: number; seen: string | null }) {
  const { t, lang } = usePrefs();
  const rating = formatRating(card.rating) && `${formatRating(card.rating)}/10`;
  const series = card.collection;
  const first = series?.parts[0];
  const meta = (series ? [seriesLabel(lang, series), rating] : [card.year, formatRuntime(card.runtime), rating]).filter(Boolean).join("  ·  ");
  return (
    <View style={[s.tape, s.row, { alignItems: "flex-start", padding: space[3], gap: space[3] }]}>
      <View style={{ width: 96 }}>
        {card.poster ? <Image source={{ uri: card.poster }} style={{ width: 96, aspectRatio: 2 / 3 }} /> : <View style={{ width: 96, aspectRatio: 2 / 3, backgroundColor: colors.shelfHigh }} />}
        {series && <SeriesSticker series={series} lang={lang} />}
      </View>
      <View style={{ flex: 1, gap: space[2] }}>
        <Text style={[s.display, { fontSize: fontSize["2xl"], color: colors.label }]}>{rank}</Text>
        <Text style={[s.display, { fontSize: fontSize.xl }]}>{card.title}</Text>
        <Text style={s.label}>{meta}</Text>
        {seen && <Text style={s.label}>{seen}</Text>}
        {first && <Text style={s.body}>{t("series.startWith", { title: first.title, year: first.year ?? "" })}</Text>}
        <ProviderBox card={card} />
        <Btn tone="label" title={`${t("results.where")} →`} onPress={() => void Linking.openURL(`${API_URL}${itemHref(card.key)}`)} />
      </View>
    </View>
  );
}
