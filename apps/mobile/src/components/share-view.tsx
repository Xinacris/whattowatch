import { useState } from "react";
import { ScrollView, Share, Text } from "react-native";
import { usePrefs } from "@/lib/prefs";
import { colors, fontSize, s } from "@/lib/theme";
import { Btn, Sticker } from "./ui";

/** Blind on purpose: how many yeses, never which. */
export function ShareView({ liked, url, note, onShared, onUndo }: { liked: number | null; url: string; note?: string | null; onShared?(): void; onUndo?: (() => void) | null }) {
  const { t } = usePrefs();
  const [sent, setSent] = useState(false);
  const share = async () => {
    onShared?.();
    const r = await Share.share({ message: url }).catch(() => null);
    if (r?.action === Share.sharedAction) setSent(true);
  };
  return (
    <ScrollView contentContainerStyle={s.pad}>
      {liked !== null && <Text style={[s.display, { fontSize: fontSize["4xl"], color: colors.label }]}>{t("share.title", { n: liked })}</Text>}
      {liked !== null && <Text style={s.label}>{t("share.blind")}</Text>}
      {note && <Sticker text={note} rotate={-1} />}
      <Text style={s.body}>{t("share.line")}</Text>
      <Btn tone="label" title={`${sent ? t("link.copied") : t("share.button")} →`} onPress={() => void share()} />
      {onUndo && <Btn title={`↶ ${t("deck.undo")}`} onPress={onUndo} style={{ borderWidth: 0, alignSelf: "flex-start", paddingHorizontal: 0 }} />}
    </ScrollView>
  );
}
