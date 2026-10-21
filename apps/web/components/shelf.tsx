import Link from "next/link";
import type { ReactNode } from "react";
import { tilt } from "@wtw/tokens";
import { staffPick, t, type Lang, type TitleSummary } from "@wtw/core";
import { Poster, ShelfScroller } from "@wtw/ui";

interface Props {
  items: TitleSummary[];
  lang: Lang;
  /** The row heading; the scroll buttons sit at the right end of its row. */
  heading: ReactNode;
  ariaLabel: string;
  end?: ReactNode;
  /** Only the main shelf has a staff pick: the best-rated title enough people have rated. */
  pick?: boolean;
}

/** A rental shelf: posters lean a little, and the best-rated well-known one wears a staff-pick sticker. */
export function Shelf({ items, lang, heading, ariaLabel, end, pick = false }: Props) {
  const picked = pick ? staffPick(items) : -1;
  return (
    <div className="relative">
      <ShelfScroller label={heading} end={end} ariaLabel={ariaLabel} headerClassName="px-4 sm:px-6" listClassName="px-4 pt-6 pb-5 sm:px-6 scroll-px-4 sm:scroll-px-6">
        {items.map((item, i) => (
          <li key={item.key} className="relative w-32 shrink-0 sm:w-40" style={{ transform: `rotate(${(tilt[i % tilt.length] ?? 0) / 3}deg)` }} data-key={item.key}>
            {i === picked && <span className="sticker absolute -top-3 -left-2 z-10 rotate-[-8deg]" data-testid="staff-pick">{t(lang, "landing.staffPick")}</span>}
            <Link href={`/title/${item.type}/${item.id}`} className="block transition-transform hover:-translate-y-1">
              <Poster src={item.poster} title={item.title} lang={lang} eager={i < 6} />
            </Link>
          </li>
        ))}
      </ShelfScroller>
      <div className="h-3 border-y-2 border-rule bg-shelf-raised" aria-hidden />
    </div>
  );
}
