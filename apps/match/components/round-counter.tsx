"use client";
import { useT } from "@wtw/ui";

/** The tape counter. Always says what's needed, so nobody wonders where the share button went. */
export function RoundCounter({ card, of, liked, need }: { card: number; of: number; liked?: number; need?: number }) {
  const t = useT();
  const text = liked === undefined || need === undefined
    ? t("round.counterFriend", { card, of })
    : t("round.counter", { liked, need, card, of });
  return (
    <p className="label tape self-start px-3 py-2 tabular-nums" role="status" data-testid="round-counter">
      {text}
    </p>
  );
}
