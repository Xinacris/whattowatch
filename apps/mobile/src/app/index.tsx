import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { normalizeRoomCode } from "@wtw/core";
import { Btn, Field } from "@/components/ui";
import { usePrefs } from "@/lib/prefs";
import { colors, fontSize, s, space } from "@/lib/theme";

export default function Home() {
  const { t, lang, setLang } = usePrefs();
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  const join = () => {
    const c = normalizeRoomCode(code);
    if (!c) { setBad(true); return; }
    router.push({ pathname: "/match/[code]", params: { code: c } });
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: space[10] }]}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={[s.display, { fontSize: fontSize.xl }]}>WhatToWatch</Text>
        <Pressable onPress={() => setLang(lang === "tr" ? "en" : "tr")} style={{ borderWidth: 2, borderColor: colors.rule, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={s.label}>{t("lang.label")}</Text>
        </Pressable>
      </View>
      <Text style={[s.display, { fontSize: 56, lineHeight: 58 }]}>{t("landing.headline")}</Text>
      <Text style={[s.body, s.dim, { fontSize: fontSize.base, lineHeight: 22 }]}>{t("landing.sub")}</Text>
      <Btn tone="label" title={`${t("landing.start")} →`} onPress={() => router.push("/new")} testID="start" />
      <View style={{ gap: space[2] }}>
        <Text style={s.label}>{t("landing.joinLabel")}</Text>
        <View style={s.row}>
          <View style={{ flex: 1 }}><Field value={code} onChangeText={(v) => { setCode(v); setBad(false); }} placeholder="K7RQ2M" autoCapitalize="characters" maxLength={8} /></View>
          <Btn title={t("landing.join")} onPress={join} />
        </View>
        {bad && <Text style={[s.body, { color: colors.nope }]}>{t("landing.badCode")}</Text>}
      </View>
      <Text style={[s.label, { color: colors.seen, marginTop: space[8] }]}>{t("footer.attribution")}</Text>
    </ScrollView>
  );
}
