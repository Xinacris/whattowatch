import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { person, t } from "@wtw/core";
import { Poster, TapeMeta } from "@wtw/ui";
import { getPrefs, tmdb } from "@wtw/ui/server";
import { TitleGrid } from "@/components/title-grid";
import { isId, orNotFound } from "@/lib/load";

type Props = PageProps<"/person/[id]">;

async function load({ params }: Props) {
  const { id } = await params;
  if (!isId(id)) notFound();
  const prefs = await getPrefs();
  return { p: await orNotFound(person(tmdb(), Number(id), prefs.tmdbLang)), ...prefs };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await load(props)).p.name };
}

export default async function PersonPage(props: Props) {
  const { p, lang } = await load(props);
  const born = p.birthday && `${t(lang, "person.born")} ${p.birthday}${p.birthplace ? `, ${p.birthplace}` : ""}`;
  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <div className="max-w-[220px]"><Poster src={p.photo} title={p.name} lang={lang} eager /></div>
        <div className="min-w-0">
          <TapeMeta parts={[p.department, born, p.deathday && `${t(lang, "person.died")} ${p.deathday}`]} />
          <h1 className="display mt-3 text-5xl break-words sm:text-6xl">{p.name}</h1>
          <p className="mt-6 max-w-2xl leading-relaxed whitespace-pre-line text-paper-dim">{p.biography || t(lang, "person.noBio")}</p>
        </div>
      </div>
      {p.credits.length > 0 && (
        <section className="mt-14">
          <h2 className="label mb-5 text-paper-dim">{t(lang, "person.knownFor")}</h2>
          <TitleGrid items={p.credits.slice(0, 36)} lang={lang} note />
        </section>
      )}
    </article>
  );
}
