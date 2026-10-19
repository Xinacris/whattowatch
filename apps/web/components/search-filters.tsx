"use client";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { activeFilterCount, clearFilters, GENRES, genreName, searchHref, type Provider, type SearchFilters } from "@wtw/core";
import { saveServices, useT, usePrefs } from "@wtw/ui";

const YEARS = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2015, 2020, 2023, 2024, 2025, 2026];
const RUNTIMES = [90, 100, 120, 150, 180];
const RATINGS = [6, 7, 7.5, 8, 8.5];
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Every change is a new URL, so back, reload and sharing all keep the filters. Sheet on phones. */
export function SearchFilters({ filters: f, providers }: { filters: SearchFilters; providers: Provider[] }) {
  const t = useT();
  const { lang, services: saved } = usePrefs();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(Array.isArray(f.services));
  const go = (next: Partial<SearchFilters>) => router.push(searchHref({ ...f, ...next, page: 1 }), { scroll: false });
  const n = activeFilterCount(f);
  const mine = Array.isArray(f.services) ? f.services : [];
  const pick = (id: number) => { const ids = toggle(mine, id); saveServices(ids); go({ services: ids.length ? ids : null }); };
  const num = (v: string) => (v ? Number(v) : null);

  return (
    <>
      <div className="flex items-center gap-3 md:hidden">
        <button type="button" className="chip" aria-pressed={n > 0} aria-expanded={open} aria-controls="filters" onClick={() => setOpen(true)} data-testid="filters-chip">
          {n ? t("filters.count", { n }) : t("filters.button")}
        </button>
        {n > 0 && <button type="button" className="label text-paper-dim underline" onClick={() => router.push(searchHref(clearFilters(f)))}>{t("filters.clear")}</button>}
      </div>
      {open && <div className="fixed inset-0 z-40 bg-shelf/80 md:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside id="filters" aria-label={t("filters.button")}
        className={`flex flex-col gap-6 ${open ? "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-50 max-md:max-h-[85dvh] max-md:overflow-y-auto max-md:border-t-2 max-md:border-paper max-md:bg-shelf max-md:p-4" : "max-md:hidden"}`}>
        <div className="flex items-center justify-between">
          <p className="display text-2xl">{n ? t("filters.count", { n }) : t("filters.button")}</p>
          {n > 0 && <button type="button" className="label text-paper-dim underline hover:text-label" onClick={() => router.push(searchHref(clearFilters(f)))}>{t("filters.clear")}</button>}
        </div>
        <Group title={t("filters.type")}>
          {(["all", "movie", "tv"] as const).map((v) => <button key={v} type="button" className="chip py-1" aria-pressed={f.type === v} onClick={() => go({ type: v })}>{t(v === "all" ? "search.all" : v === "movie" ? "common.movie" : "common.tv")}</button>)}
        </Group>
        <Group title={t("filters.where")}>
          <button type="button" className="chip py-1" aria-pressed={f.services === null && !picking} onClick={() => { setPicking(false); go({ services: null }); }}>{t("filters.anywhere")}</button>
          <button type="button" className="chip py-1" aria-pressed={f.services === "any"} onClick={() => { setPicking(false); go({ services: "any" }); }}>{t("filters.anyService")}</button>
          <button type="button" className="chip py-1" aria-pressed={picking} data-testid="only-mine" onClick={() => { setPicking(true); if (saved.length) go({ services: saved }); }}>{t("filters.mine")}</button>
          {picking && <p className="w-full text-sm text-paper-dim">{t("filters.pickServices")}</p>}
          {picking && providers.map((p) => (
            <button key={p.id} type="button" className="chip flex items-center gap-2 py-1 pl-1" aria-pressed={mine.includes(p.id)} onClick={() => pick(p.id)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- TMDB provider logo */}
              {p.logo && <img src={p.logo} alt="" className="size-5" />}{p.name}
            </button>
          ))}
        </Group>
        <Group title={t("filters.genres")}>
          {GENRES.map((g) => <button key={g.slug} type="button" className="chip py-1" aria-pressed={f.genres.includes(g.slug)} onClick={() => go({ genres: toggle(f.genres, g.slug) })}>{genreName(lang, g.slug)}</button>)}
        </Group>
        <Group title={t("filters.years")}>
          <Select label={t("filters.from")} value={f.yearMin} options={YEARS} onChange={(v) => go({ yearMin: num(v) })} />
          <Select label={t("filters.to")} value={f.yearMax} options={YEARS} onChange={(v) => go({ yearMax: num(v) })} />
        </Group>
        <Group title={t("filters.runtime")}>
          <Select label={t("filters.runtime")} hideLabel value={f.runtimeMax} options={RUNTIMES} format={(m) => `${m} min`} onChange={(v) => go({ runtimeMax: num(v) })} />
        </Group>
        <Group title={t("filters.rating")}>
          <Select label={t("filters.rating")} hideLabel value={f.ratingMin} options={RATINGS} format={(r) => `${r}+`} onChange={(v) => go({ ratingMin: num(v) })} />
          <button type="button" className="chip py-1" aria-pressed={f.turkish} onClick={() => go({ turkish: !f.turkish })}>{t("filters.turkish")}</button>
        </Group>
        <Group title={t("filters.sort")}>
          {(["popular", "rating", "newest"] as const).map((v) => <button key={v} type="button" className="chip py-1" aria-pressed={f.sort === v} onClick={() => go({ sort: v })}>{t(`sort.${v}`)}</button>)}
        </Group>
        <button type="button" className="btn btn-label md:hidden" onClick={() => setOpen(false)}>{t("filters.done")}</button>
      </aside>
    </>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-wrap gap-2 border-t-2 border-rule pt-3">
      <legend className="label mb-2 text-paper-dim">{title}</legend>
      {children}
    </fieldset>
  );
}

function Select({ label, value, options, onChange, format = String, hideLabel = false }: { label: string; value: number | null; options: number[]; onChange(v: string): void; format?: (n: number) => string; hideLabel?: boolean }) {
  const t = useT();
  const all = value !== null && !options.includes(value) ? [...options, value].sort((a, b) => a - b) : options; // presets like 1999
  return (
    <label className="label flex items-center gap-2">
      <span className={hideLabel ? "sr-only" : "text-paper-dim"}>{label}</span>
      <select className="field py-1 text-sm" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t("filters.any")}</option>
        {all.map((o) => <option key={o} value={o}>{format(o)}</option>)}
      </select>
    </label>
  );
}
