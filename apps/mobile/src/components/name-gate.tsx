import { useState } from "react";
import { Text, View } from "react-native";
import { usePrefs } from "@/lib/prefs";
import { fontSize, s } from "@/lib/theme";
import { setViewerName } from "@/lib/viewer";
import { Btn, Field } from "./ui";

export function NameGate({ title, initial, onDone }: { title: string; initial: string; onDone(name: string): void }) {
  const { t } = usePrefs();
  const [name, setName] = useState(initial);
  return (
    <View style={[s.pad, { paddingTop: 48 }]}>
      <Text style={[s.display, { fontSize: fontSize["3xl"] }]}>{title}</Text>
      <Text style={s.label}>{t("setup.name")}</Text>
      <Field value={name} onChangeText={setName} placeholder={t("setup.namePlaceholder")} />
      <Btn tone="label" title={`${t("join.cta")} →`} disabled={!name.trim()} onPress={() => void setViewerName(name).then(() => onDone(name.trim()))} />
    </View>
  );
}
