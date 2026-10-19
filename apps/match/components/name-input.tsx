"use client";
import { useT } from "@wtw/ui";

export function NameInput({ value, onChange }: { value: string; onChange(v: string): void }) {
  const t = useT();
  return (
    <label className="flex flex-col gap-2">
      <span className="display text-2xl">{t("setup.name")}</span>
      <input className="field max-w-xs" value={value} maxLength={40} autoComplete="nickname" placeholder={t("setup.namePlaceholder")} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** Shown when someone opens a room or link before telling us who they are. */
export function NameGate({ title, value, onChange, onSubmit }: { title: string; value: string; onChange(v: string): void; onSubmit(): void }) {
  const t = useT();
  return (
    <form className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16" onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSubmit(); }}>
      <h1 className="display text-5xl">{title}</h1>
      <NameInput value={value} onChange={onChange} />
      <button className="btn btn-label self-start" disabled={!value.trim()}>{t("join.cta")} →</button>
    </form>
  );
}
