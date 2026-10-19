import { Text } from "react-native";
import { usePrefs } from "@/lib/prefs";
import { s, space } from "@/lib/theme";

/** Same tape counter as the web: what's liked, what's needed, where you are. */
export function RoundCounter({ card, of, liked, need }: { card: number; of: number; liked?: number; need?: number }) {
  const { t } = usePrefs();
  const text = liked === undefined || need === undefined ? t("round.counterFriend", { card, of }) : t("round.counter", { liked, need, card, of });
  return <Text accessibilityRole="text" style={[s.label, s.tape, { alignSelf: "flex-start", paddingHorizontal: space[3], paddingVertical: space[2] }]}>{text.toUpperCase()}</Text>;
}
