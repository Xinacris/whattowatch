import { Image, Linking, Pressable, Text, View } from "react-native";
import { providerHref, type DeckCard } from "@wtw/core";
import { usePrefs } from "@/lib/prefs";
import { s } from "@/lib/theme";

/** Where it's on: logos open the platform, the JustWatch credit closes the box (TMDB's terms). Same rules as the web's ProviderList. */
export function ProviderBox({ card }: { card: Pick<DeckCard, "providers" | "providersLink"> }) {
  const { t, region } = usePrefs();
  const link = card.providersLink ?? null;
  if (!card.providers.length) return <Text style={[s.body, s.dim]}>{t("results.notStreaming", { region })}</Text>;
  return (
    <View style={{ gap: 8 }}>
      <View style={s.wrap}>
        {card.providers.map((p) => {
          const href = providerHref(p.id, link);
          const logo = p.logo ? <Image source={{ uri: p.logo }} accessibilityLabel={p.name} style={{ width: 28, height: 28 }} /> : <Text style={s.label}>{p.name}</Text>;
          return href ? <Pressable key={p.id} accessibilityRole="link" onPress={() => void Linking.openURL(href)}>{logo}</Pressable> : <View key={p.id}>{logo}</View>;
        })}
      </View>
      <JustWatchCredit link={link} />
    </View>
  );
}

function JustWatchCredit({ link }: { link: string | null }) {
  const { t } = usePrefs();
  if (!link) return <Text style={s.label}>{t("providers.data")}</Text>;
  return <Text style={s.label} accessibilityRole="link" onPress={() => void Linking.openURL(link)}>{t("providers.allOptions")} ↗</Text>;
}
