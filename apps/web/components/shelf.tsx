import Link from "next/link";
import { tilt } from "@wtw/tokens";
import { t, type Lang, type TitleSummary } from "@wtw/core";
import { Poster } from "@wtw/ui";

/** A rental shelf: posters lean a little, one wears a staff-pick sticker. */
export function Shelf({ items, lang, pick = 2 }: { items: TitleSummary[]; lang: Lang; pick?: number }) {
  return (
    <div className="relative">
      <ul className="flex gap-4 overflow-x-auto px-4 pt-6 pb-5 sm:px-6 [scrollbar-width:thin]">
        {items.map((item, i) => (
          <li key={item.key} className="relative w-32 shrink-0 sm:w-40" style={{ transform: `rotate(${(tilt[i % tilt.length] ?? 0) / 3}deg)` }}>
            {i === pick && <span className="sticker absolute -top-3 -left-2 z-10 rotate-[-8deg]">{t(lang, "landing.staffPick")}</span>}
            <Link href={`/title/${item.type}/${item.id}`} className="block hover:-translate-y-1 transition-transform">
              <Poster src={item.poster} title={item.title} lang={lang} eager={i < 6} />
            </Link>
          </li>
        ))}
      </ul>
      <div className="h-3 border-y-2 border-rule bg-shelf-raised" aria-hidden />
    </div>
  );
}
