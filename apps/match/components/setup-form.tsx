"use client";
import { useState } from "react";
import { freshLink, formatRuntime, GENRES, genreName, makeSeed, MAX_GENRES, sanitizeFilters, type Era, type Kind } from "@wtw/core";
import { useT, usePrefs } from "@wtw/ui";
import { api } from "@/lib/api";
import { getViewer, setViewerName } from "@/lib/viewer";
import { Choice, Field, Toggle } from "./chips";
import { NameInput } from "./name-input";

interface Provider { id: number; name: string; logo: string | null }
type Mode = "live" | "link";

export function SetupForm({ providers, liveAvailable }: { providers: Provider[]; liveAvailable: boolean }) {
  const t = useT();
  const { lang, region } = usePrefs();
  const [mode, setMode] = useState<Mode>(liveAvailable ? "live" : "link");
  const [kind, setKind] = useState<Kind>("movie");
  const [services, setServices] = useState<number[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [runtime, setRuntime] = useState<number>(0);
  const [era, setEra] = useState<Era>("any");
  const [name, setName] = useState(() => getViewer().name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(list: T[], v: T, on: boolean) => (on ? [...list, v] : list.filter((x) => x !== v));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError(t("setup.nameMissing")); return; }
    setViewerName(name);
    const filters = sanitizeFilters({ kind, providers: services, genres, maxRuntime: runtime || null, era, region });
    if (mode === "link") {
      // Hard navigation: fresh deck store, and the URL is the whole state in link mode.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/match/link?d=${freshLink(filters, makeSeed())}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const room = await api.createRoom(getViewer(), filters);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/match/${room.code}`);
    } catch {
      setBusy(false);
      setError(t("setup.liveDown"));
      setMode("link");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      <Field legend={t("setup.mode")} hint={mode === "live" ? t("setup.mode.liveHint") : t("setup.mode.linkHint")}>
        <Choice name="mode" value={mode} onChange={setMode} options={[{ value: "live", label: t("setup.mode.live") }, { value: "link", label: t("setup.mode.link") }].filter((o) => liveAvailable || o.value === "link") as { value: Mode; label: string }[]} />
        {!liveAvailable && <p className="w-full text-sm text-label">{t("setup.liveDown")}</p>}
      </Field>
      <Field legend={t("setup.what")}>
        <Choice name="kind" value={kind} onChange={setKind} options={(["movie", "tv", "both"] as const).map((v) => ({ value: v, label: t(`setup.kind.${v}`) }))} />
      </Field>
      <Field legend={t("setup.services")} hint={providers.length ? t("setup.servicesHint") : t("setup.noServices", { region })}>
        {providers.map((p) => (
          <Toggle key={p.id} checked={services.includes(p.id)} onChange={(on) => setServices(toggle(services, p.id, on))}>
            {/* eslint-disable-next-line @next/next/no-img-element -- TMDB provider logo */}
            {p.logo && <img src={p.logo} alt="" className="size-6" />}
            {p.name}
          </Toggle>
        ))}
      </Field>
      <Field legend={t("setup.genres")}>
        <Toggle checked={genres.length === 0} onChange={() => setGenres([])}>{t("setup.anything")}</Toggle>
        {GENRES.map((g) => (
          <Toggle key={g.slug} checked={genres.includes(g.slug)} disabled={!genres.includes(g.slug) && genres.length >= MAX_GENRES} onChange={(on) => setGenres(toggle(genres, g.slug, on))}>
            {genreName(lang, g.slug)}
          </Toggle>
        ))}
      </Field>
      <Field legend={t("setup.runtime")}>
        <Choice name="runtime" value={runtime} onChange={setRuntime} options={[0, 90, 120, 150].map((m) => ({ value: m, label: m ? t("setup.runtime.under", { t: formatRuntime(m) ?? "" }) : t("setup.runtime.none") }))} />
      </Field>
      <Field legend={t("setup.era")}>
        <Choice name="era" value={era} onChange={setEra} options={(["new", "classic", "any"] as const).map((v) => ({ value: v, label: t(`setup.era.${v}`) }))} />
      </Field>
      <div className="border-t-2 border-rule pt-5">
        <NameInput value={name} onChange={(v) => { setName(v); setError(null); }} />
      </div>
      {error && <p role="alert" className="text-nope">{error}</p>}
      <button type="submit" className="btn btn-label self-start px-6 py-4 text-base" disabled={busy}>
        {busy ? t("setup.creating") : mode === "live" ? t("setup.create") : t("setup.createLink")} →
      </button>
    </form>
  );
}
