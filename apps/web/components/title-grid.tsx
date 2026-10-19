import Link from "next/link";
import { t, type Lang, type TitleSummary } from "@wtw/core";
import { Poster } from "@wtw/ui";

/** Uneven on purpose: titles wrap to their own length, no fixed card heights. */
export function TitleGrid({ items, lang, note }: { items: (TitleSummary & { role?: string | null })[]; lang: Lang; note?: boolean }) {
  return (
    <ul className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <li key={item.key}>
          <Link href={`/title/${item.type}/${item.id}`} className="group block">
            <Poster src={item.poster ? item.poster.replace("/w500/", "/w342/") : null} title={item.title} lang={lang} className="group-hover:border-label" />
            <p className="mt-2 text-sm leading-tight font-semibold break-words group-hover:text-label">{item.title}</p>
            <p className="label mt-1 text-[11px] text-paper-dim">
              {[item.year, t(lang, item.type === "movie" ? "common.movie" : "common.tv")].filter(Boolean).join(" · ")}
            </p>
            {note && item.role && <p className="mt-1 line-clamp-1 text-xs text-seen">{item.role}</p>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
