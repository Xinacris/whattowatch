import type { ReactNode } from "react";
import { Pressable, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, font, fontSize, s, space } from "@/lib/theme";

type Tone = "label" | "ghost" | "nope";

export function Btn({ title, onPress, tone = "ghost", disabled, style, testID }: { title: string; onPress(): void; tone?: Tone; disabled?: boolean; style?: StyleProp<ViewStyle>; testID?: string }) {
  const bg = tone === "label" ? colors.label : "transparent";
  const fg = tone === "label" ? colors.labelInk : tone === "nope" ? colors.nope : colors.paper;
  const bd = tone === "label" ? colors.labelInk : tone === "nope" ? colors.nope : colors.paper;
  return (
    <Pressable testID={testID} accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{ backgroundColor: bg, borderColor: bd, borderWidth: 2, paddingVertical: 13, paddingHorizontal: 16, alignItems: "center", opacity: disabled ? 0.4 : 1, transform: [{ translateX: pressed ? 2 : 0 }, { translateY: pressed ? 2 : 0 }] }, style]}>
      <Text style={{ fontFamily: font.monoBold, color: fg, fontSize: fontSize.sm, letterSpacing: 1.2, textTransform: "uppercase" }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress, disabled }: { label: string; on: boolean; onPress(): void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled }} disabled={disabled} onPress={onPress}
      style={{ borderWidth: 2, borderColor: on ? colors.label : colors.rule, backgroundColor: on ? colors.label : "transparent", paddingVertical: 7, paddingHorizontal: 11, opacity: disabled ? 0.4 : 1 }}>
      <Text style={{ fontFamily: font.mono, fontSize: fontSize.sm, color: on ? colors.labelInk : colors.paper }}>{label}</Text>
    </Pressable>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ borderTopWidth: 2, borderTopColor: colors.rule, paddingTop: space[4], gap: space[3] }}>
      <Text style={[s.display, { fontSize: fontSize.xl }]}>{title}</Text>
      {hint && <Text style={[s.body, s.dim]}>{hint}</Text>}
      <View style={s.wrap}>{children}</View>
    </View>
  );
}

export function Field({ value, onChangeText, placeholder, autoCapitalize = "words", maxLength = 40 }: { value: string; onChangeText(v: string): void; placeholder?: string; autoCapitalize?: "words" | "characters"; maxLength?: number }) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.seen} autoCapitalize={autoCapitalize} autoCorrect={false} maxLength={maxLength} style={s.field} />;
}

export function Notice({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={[s.pad, { paddingTop: 80 }]}>
      <Text style={[s.display, { fontSize: fontSize["3xl"] }]}>{title}</Text>
      {body && <Text style={[s.body, s.dim]}>{body}</Text>}
      {action}
    </View>
  );
}

export function Sticker({ text, rotate = -4 }: { text: string; rotate?: number }) {
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: colors.label, borderWidth: 2, borderColor: colors.labelInk, paddingHorizontal: 7, paddingVertical: 3, transform: [{ rotate: `${rotate}deg` }] }}>
      <Text style={{ fontFamily: font.monoBold, fontSize: fontSize.xs, color: colors.labelInk, textTransform: "uppercase", letterSpacing: 1 }}>{text}</Text>
    </View>
  );
}
