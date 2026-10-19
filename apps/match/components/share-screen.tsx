"use client";
import { useState } from "react";
import { useT } from "@wtw/ui";
import { shareUrl } from "@/lib/share";

interface Props { liked: number | null; url: string; note?: string | null; onShared?(): void; onUndo?: (() => void) | null }

/** Blind on purpose: how many, never which. */
export function ShareScreen({ liked, url, note, onShared, onUndo }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  async function share() {
    onShared?.();
    setCopied(await shareUrl(url));
  }
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-14" data-testid="share-screen">
      {liked !== null && <h1 className="display text-6xl text-label sm:text-7xl">{t("share.title", { n: liked })}</h1>}
      {liked !== null && <p className="label text-paper-dim">{t("share.blind")}</p>}
      {note && <p className="sticker -rotate-1 self-start">{note}</p>}
      <p className="max-w-md text-lg">{t("share.line")}</p>
      <button type="button" className="btn btn-label self-start px-7 py-5 text-lg" onClick={share} data-testid="share">
        {copied ? t("link.copied") : t("share.button")} →
      </button>
      <label className="flex flex-col gap-2">
        <span className="label text-paper-dim">{t("share.orCopy")}</span>
        <input readOnly className="field text-sm" value={url} onFocus={(e) => e.currentTarget.select()} data-testid="share-url" />
      </label>
      {onUndo && <button type="button" className="label self-start text-paper-dim hover:text-label hover:underline" onClick={onUndo}>↶ {t("deck.undo")}</button>}
    </section>
  );
}
