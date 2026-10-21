"use client";
import { useState, type ReactNode } from "react";
import { useT } from "@wtw/ui";
import { shareUrl } from "@/lib/share";

interface Props { title: string; line: string; url: string; onShared?(): void; onUndo?: (() => void) | null; children?: ReactNode }

/** Blind on purpose: how many, never which. A headline, one line, the button, the link. */
export function ShareScreen({ title, line, url, onShared, onUndo, children }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  async function share() {
    onShared?.();
    setCopied(await shareUrl(url));
  }
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-14" data-testid="share-screen">
      <h1 className="display text-6xl text-label sm:text-7xl">{title}</h1>
      <p className="max-w-md text-lg">{line}</p>
      <button type="button" className="btn btn-label self-start px-7 py-5 text-lg" onClick={share} data-testid="share">
        {copied ? t("link.copied") : t("share.button")} →
      </button>
      <input readOnly aria-label={t("share.button")} className="field text-sm" value={url} onFocus={(e) => e.currentTarget.select()} data-testid="share-url" />
      {onUndo && <button type="button" className="label self-start text-paper-dim hover:text-label hover:underline" onClick={onUndo}>↶ {t("deck.undo")}</button>}
      {children}
    </section>
  );
}
