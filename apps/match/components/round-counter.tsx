"use client";
import { tapeText } from "@wtw/core";
import { usePrefs } from "@wtw/ui";

/** The tape counter. Always says what's needed, so nobody wonders where the share button went. */
export function RoundCounter({ card, of, liked }: { card: number; of: number; liked?: number }) {
  const { lang } = usePrefs();
  return (
    <p className="label tape self-start px-3 py-2 tabular-nums" role="status" data-testid="round-counter">
      {tapeText(lang, { card, of, liked })}
    </p>
  );
}
