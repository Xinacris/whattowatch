import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { collection, t } from "@wtw/core";
import { Poster } from "@wtw/ui";
import { getPrefs, tmdb } from "@wtw/ui/server";
import { TitleGrid } from "@/components/title-grid";
import { isId, orNotFound } from "@/lib/load";

type Props = PageProps<"/collection/[id]">;

async function load({ params }: Props) {
  const { id } = await params;
  if (!isId(id)) notFound();
  const prefs = await getPrefs();
  return { c: await orNotFound(collection(tmdb(), Number(id), prefs.tmdbLang)), ...prefs };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await load(props)).c.name };
}

export default async function CollectionPage(props: Props) {
  const { c, lang } = await load(props);
  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <div className="max-w-[220px]"><Poster src={c.poster} title={c.name} lang={lang} eager /></div>
        <div>
          <h1 className="display text-5xl break-words sm:text-6xl">{c.name}</h1>
          <p className="mt-6 max-w-2xl leading-relaxed text-paper-dim">{c.overview}</p>
        </div>
      </div>
      <section className="mt-14">
        <h2 className="label mb-5 text-paper-dim">{t(lang, "collection.parts")} · {c.parts.length}</h2>
        <TitleGrid items={c.parts} lang={lang} />
      </section>
    </article>
  );
}
