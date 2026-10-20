import Link from "next/link";
import { seriesLabel, type CollectionSummary, type Lang, type Provider } from "@wtw/core";
import { Poster } from "./poster";

export { seriesLabel } from "@wtw/core";

interface Props {
  summary: Pick<CollectionSummary, "id" | "name" | "poster" | "partCount" | "yearFrom" | "yearTo">;
  lang: Lang;
  logos?: Provider[];
  /** One short line under the label: "2 of 5 on Netflix", "Has Shrek 2", "Start with: Shrek (2001)". */
  note?: string | null;
  href?: string;
  eager?: boolean;
  /** Just the box, no name under it (when the name is printed next to it). */
  bare?: boolean;
}

/**
 * A film series as one card, used by search, shelves and results. Drawn as a box set: the poster
 * with a second case peeking out behind it, so it never reads as a single title.
 */
export function CollectionCard({ summary: s, lang, logos = [], note, href, eager = false, bare = false }: Props) {
  return (
    <Link href={href ?? `/collection/${s.id}`} className="group block" data-testid="collection-card" data-collection={s.id}>
      <div className="relative mr-1.5 mt-1.5">
        <div className="absolute inset-0 translate-x-1.5 -translate-y-1.5 border-2 border-rule bg-shelf-high" aria-hidden />
        <div className="relative">
          <Poster src={s.poster ? s.poster.replace("/w500/", "/w342/") : null} title={s.name} lang={lang} eager={eager} className="group-hover:border-label" />
          <span className="sticker absolute bottom-2 left-2 rotate-[-2deg]">{seriesLabel(lang, s)}</span>
        </div>
      </div>
      {!bare && <p className="mt-2 text-sm leading-tight font-semibold break-words group-hover:text-label">{s.name}</p>}
      {note && <p className="label mt-1 text-[11px] text-label">{note}</p>}
      {logos.length > 0 && (
        <span className="mt-2 flex gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- TMDB provider logos */}
          {logos.map((p) => p.logo && <img key={p.id} src={p.logo} alt={p.name} title={p.name} className="size-6 border border-rule" />)}
        </span>
      )}
    </Link>
  );
}
