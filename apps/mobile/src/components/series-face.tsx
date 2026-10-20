import { ScrollView, Text, View } from "react-native";
import { formatRuntime, seriesLabel, type CollectionSummary, type Lang } from "@wtw/core";
import { colors, font, fontSize, s, space } from "@/lib/theme";

/** The tape label on a box set: `5 FILMS · 2001–2010`. */
export function SeriesSticker({ series, lang }: { series: CollectionSummary; lang: Lang }) {
  return (
    <View style={{ position: "absolute", top: 12, left: 12, backgroundColor: colors.label, borderWidth: 2, borderColor: colors.labelInk, paddingHorizontal: 7, paddingVertical: 3, transform: [{ rotate: "-2deg" }] }}>
      <Text style={{ fontFamily: font.monoBold, fontSize: fontSize.xs, color: colors.labelInk, textTransform: "uppercase" }}>{seriesLabel(lang, series)}</Text>
    </View>
  );
}

/** The back of the box: every film in it, in order. */
export function SeriesBack({ series }: { series: CollectionSummary }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {series.parts.map((p, i) => (
        <View key={p.id} style={[s.row, { alignItems: "baseline", gap: space[3], paddingVertical: 8, borderBottomWidth: i === series.parts.length - 1 ? 0 : 2, borderBottomColor: colors.rule }]}>
          <Text style={[s.display, { fontSize: fontSize.xl, color: colors.paperDim, width: 22 }]}>{i + 1}</Text>
          <Text style={[s.body, { flex: 1, fontFamily: font.monoBold }]}>{p.title}</Text>
          <Text style={s.label}>{[p.year, formatRuntime(p.runtime)].filter(Boolean).join(" · ")}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
