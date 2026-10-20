import { StyleSheet } from "react-native";
import { border, colors, fontSize, radius, space } from "@wtw/tokens";

// Tokens come from @wtw/tokens, the same source as the web's Tailwind theme.
export const font = { display: "Anton_400Regular", mono: "IBMPlexMono_400Regular", monoBold: "IBMPlexMono_700Bold" } as const;
export { colors, fontSize, space };

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.shelf },
  pad: { paddingHorizontal: space[4], paddingVertical: space[6], gap: space[5] },
  display: { fontFamily: font.display, color: colors.paper, textTransform: "uppercase", lineHeight: undefined },
  label: { fontFamily: font.mono, color: colors.paperDim, fontSize: fontSize.xs, letterSpacing: 1.2, textTransform: "uppercase" },
  body: { fontFamily: font.mono, color: colors.paper, fontSize: fontSize.sm, lineHeight: 20 },
  dim: { color: colors.paperDim },
  tape: { borderWidth: border.width, borderColor: colors.rule, backgroundColor: colors.shelfRaised, borderRadius: radius.sm },
  field: {
    fontFamily: font.mono, fontSize: fontSize.base, color: colors.paper, backgroundColor: colors.shelfHigh,
    borderWidth: border.width, borderColor: colors.rule, borderRadius: radius.sm, paddingHorizontal: space[3], paddingVertical: space[3],
  },
  row: { flexDirection: "row", alignItems: "center", gap: space[2] },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
});
