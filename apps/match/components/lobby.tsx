"use client";
import { useState } from "react";
import type { Member } from "@wtw/core";
import { useT } from "@wtw/ui";

export function Lobby({ code, members, me, onStart }: { code: string; members: Member[]; me: string; onStart(): void }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/match/${code}`;
  async function share() {
    try {
      if (navigator.share) await navigator.share({ url, title: "WhatToWatch" });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch { /* user cancelled the share sheet */ }
  }
  return (
    <section className="mx-auto grid max-w-4xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2">
      <div>
        <p className="label text-paper-dim">{t("lobby.code")}</p>
        <p className="display mt-2 text-7xl tracking-[0.12em] text-label sm:text-8xl" data-testid="room-code">{code}</p>
        <button type="button" className="btn btn-ghost mt-6" onClick={share}>{copied ? t("lobby.copied") : t("lobby.copy")}</button>
      </div>
      <div>
        <h2 className="display text-3xl">{t("lobby.here")}</h2>
        <ul className="mt-4 flex flex-col gap-2" data-testid="members">
          {members.map((m, i) => (
            <li key={m.id} className="tape flex items-center gap-3 px-3 py-2" style={{ transform: `rotate(${i % 2 ? 0.6 : -0.6}deg)` }}>
              <span className="display text-xl">{m.name}</span>
              {m.id === me && <span className="label text-paper-dim">({t("lobby.you")})</span>}
            </li>
          ))}
        </ul>
        {members.length < 2 && <p className="mt-4 text-paper-dim">{t("lobby.waiting")}</p>}
        <button type="button" className="btn btn-label mt-8" disabled={members.length < 2} onClick={onStart}>{t("lobby.start")} →</button>
      </div>
    </section>
  );
}
