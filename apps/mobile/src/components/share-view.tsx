import { useState } from "react";
import { ScrollView, Share, Text } from "react-native";
import { usePrefs } from "@/lib/prefs";
import { colors, fontSize, s } from "@/lib/theme";
import { Btn } from "./ui";

/** Blind on purpose: how many yeses, never which. A headline, one line, the button. */
export function ShareView({ title, line, url, onShared, onUndo }: { title: string; line: string; url: string; onShared?(): void; onUndo?: (() => void) | null }) {
  const { t } = usePrefs();
  const [sent, setSent] = useState(false);
  const share = async () => {
    onShared?.();
    const r = await Share.share({ message: url }).catch(() => null);
    if (r?.action === Share.sharedAction) setSent(true);
  };
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={[s.display, { fontSize: fontSize["4xl"], color: colors.label }]}>{title}</Text>
      <Text style={s.body}>{line}</Text>
      <Btn tone="label" title={`${sent ? t("link.copied") : t("share.button")} →`} onPress={() => void share()} />
      {onUndo && <Btn title={`↶ ${t("deck.undo")}`} onPress={onUndo} style={{ borderWidth: 0, alignSelf: "flex-start", paddingHorizontal: 0 }} />}
    </ScrollView>
  );
}
