import Link from "next/link";
import { t, trending, type TitleSummary } from "@wtw/core";
import { getPrefs, tmdb } from "@wtw/ui/server";
import { JoinForm } from "@/components/join-form";
import { Shelf } from "@/components/shelf";

async function shelfItems(tmdbLang: string): Promise<TitleSummary[]> {
  try {
    return (await trending(tmdb(), tmdbLang)).filter((s) => s.poster).slice(0, 14);
  } catch {
    return []; // the landing still works without posters; the shelf just isn't there
  }
}

export default async function Landing() {
  const { lang, tmdbLang } = await getPrefs();
  const items = await shelfItems(tmdbLang);
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-12 pb-10 sm:px-6 md:grid-cols-[1.4fr_1fr] md:pt-20">
        <div>
          <p className="label text-label">{t(lang, "landing.kicker")}</p>
          <h1 className="display mt-4 text-[13vw] leading-[0.94] text-paper md:text-7xl lg:text-[88px]">{t(lang, "landing.headline")}</h1>
        </div>
        <div className="flex flex-col justify-end gap-8 md:pb-3">
          <p className="max-w-sm text-lg text-paper-dim">{t(lang, "landing.sub")}</p>
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
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <form action="/search" className="flex max-w-lg flex-col gap-2">
          <label htmlFor="q" className="label text-paper-dim">{t(lang, "landing.orSearch")}</label>
          <div className="flex">
            <input id="q" name="q" className="field flex-1" placeholder={t(lang, "search.placeholder")} />
            <button className="btn btn-ghost -ml-[2px]">{t(lang, "nav.search")}</button>
          </div>
        </form>
      </section>
    </>
  );
}
