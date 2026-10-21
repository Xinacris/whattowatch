"use client";
import { useT } from "@wtw/ui";

/** Two people, one phone: hand it over and the next person types their name. `href` opens the latest link at the name gate. */
export function PassPhone({ href, onClick }: { href?: string; onClick?(): void }) {
  const t = useT();
  const cls = "label self-start text-paper-dim hover:text-label hover:underline";
  const text = `${t("link.passPhone")} →`;
  if (href) return <a href={`${href}&pass=1`} className={cls} onClick={onClick} data-testid="pass-phone">{text}</a>;
  return <button type="button" className={cls} onClick={onClick} data-testid="pass-phone">{text}</button>;
}

/** The link was opened from "Pass the phone": start at the name gate, then drop the flag from the address. */
export const passedPhone = () => new URLSearchParams(window.location.search).has("pass");
export const clearPassed = () => window.history.replaceState(null, "", window.location.href.replace(/&pass=1/, ""));
