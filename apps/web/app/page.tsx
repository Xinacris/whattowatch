import Link from "next/link";
import { browse, DEFAULT_SEARCH, searchHref, t, trending, type Lang, type SearchFilters, type TitleSummary } from "@wtw/core";
import { SearchBox } from "@wtw/ui";
import { getPrefs, tmdb } from "@wtw/ui/server";
import { JoinForm } from "@/components/join-form";
import { Shelf } from "@/components/shelf";

const withPosters = (list: TitleSummary[]) => list.filter((s) => s.poster).slice(0, 14);

async function shelfItems(tmdbLang: string): Promise<TitleSummary[]> {
  try {
    return withPosters(await trending(tmdb(), tmdbLang));
  } catch {
    return []; // the landing still works without posters; the shelf just isn't there
  }
}

interface Row { title: string; filters: Partial<SearchFilters> }

function browseRows(lang: Lang, region: string, services: number[]): Row[] {
  return [
    { title: t(lang, "browse.short"), filters: { runtimeMax: 100, type: "movie" } },
    services.length
      ? { title: t(lang, "browse.services"), filters: { services } }
      : { title: t(lang, "browse.streaming", { region }), filters: { services: "any" } },
    { title: t(lang, "browse.old"), filters: { yearMax: 1999, ratingMin: 7.5, sort: "rating" } },
    { title: t(lang, "browse.turkish"), filters: { type: "movie", turkish: true } },
  ];
}

async function rowItems(row: Row, region: string, tmdbLang: string): Promise<TitleSummary[]> {
  try {
    return withPosters((await browse(tmdb(), { ...DEFAULT_SEARCH, ...row.filters }, region, tmdbLang)).titles);
  } catch {
    return [];
  }
}

export default async function Landing() {
  const { lang, region, tmdbLang, services } = await getPrefs();
  const rows = browseRows(lang, region, services);
  const [items, ...rowLists] = await Promise.all([shelfItems(tmdbLang), ...rows.map((r) => rowItems(r, region, tmdbLang))]);
  return (
    <>
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 pt-10 pb-10 sm:px-6 md:grid-cols-[1.6fr_1fr] md:gap-12 md:pt-16">
        <div className="flex min-w-0 flex-col gap-5">
          <p className="label text-label">{t(lang, "landing.kicker")}</p>
          <h1 className="display text-[15vw] leading-[0.92] text-paper md:text-8xl">{t(lang, "landing.ask")}</h1>
          <p className="max-w-md text-lg text-paper-dim">{t(lang, "landing.askSub")}</p>
          <SearchBox size="hero" autoFocus />
        </div>
        <div className="flex flex-col justify-end gap-6 border-t-2 border-rule pt-6 md:border-t-0 md:border-l-2 md:pt-0 md:pb-2 md:pl-8">
          <p className="display text-3xl">{t(lang, "landing.orNight")}</p>
          <p className="max-w-sm text-paper-dim">{t(lang, "landing.sub")}</p>
          <Link href="/match/new" className="btn btn-label self-start px-6 py-4 text-base">{t(lang, "landing.start")} →</Link>
          <JoinForm />
        </div>
      </section>
      {items.length > 0 && (
        <section aria-label={t(lang, "landing.shelf")} className="mx-auto max-w-6xl">
          <h2 className="label px-4 text-paper-dim sm:px-6">{t(lang, "landing.shelf")}</h2>
          <Shelf items={items} lang={lang} />
        </section>
      )}
      {rows.map((row, i) => (rowLists[i]?.length ?? 0) > 0 && (
        <section key={row.title} aria-label={row.title} className="mx-auto mt-10 max-w-6xl">
          <div className="flex items-baseline justify-between gap-4 px-4 sm:px-6">
            <h2 className="display text-3xl">{row.title}</h2>
            <Link href={searchHref(row.filters)} className="label shrink-0 text-label hover:underline">{t(lang, "browse.all")} →</Link>
          </div>
          <Shelf items={rowLists[i] ?? []} lang={lang} pick={-1} />
        </section>
      ))}
    </>
  );
}
