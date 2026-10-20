import { Text } from "react-native";
import { tapeText } from "@wtw/core";
import { usePrefs } from "@/lib/prefs";
import { s, space } from "@/lib/theme";

/** Same tape counter as the web: what's liked, what's needed, where you are. */
export function RoundCounter({ card, of, liked }: { card: number; of: number; liked?: number }) {
  const { lang } = usePrefs();
  return <Text accessibilityRole="text" style={[s.label, s.tape, { alignSelf: "flex-start", paddingHorizontal: space[3], paddingVertical: space[2] }]}>{tapeText(lang, { card, of, liked }).toUpperCase()}</Text>;
}
