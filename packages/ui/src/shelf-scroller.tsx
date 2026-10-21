"use client";
import { Children, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { t } from "@wtw/core";
import { usePrefs } from "./prefs-client";
import { useScrollEnds } from "./use-scroll-ends";

interface Props {
  /** The row heading, rendered by the parent; the prev/next buttons sit at the right end of its row. */
  label?: ReactNode;
  /** Anything else for the heading row, before the buttons ("See all →"). */
  end?: ReactNode;
  ariaLabel: string;
  /** Padding for the heading row and the list; the list's scroll padding should match it. */
  headerClassName?: string;
  listClassName?: string;
  children: ReactNode;
}

const FADE = { both: "fade-both", left: "fade-left", right: "fade-right", none: "" } as const;
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A horizontal poster row: native overflow and scroll snap, no scrollbar, a fade only on the side
 * where there's more, and prev/next buttons for mouse users. The vertical wheel is left alone.
 */
export function ShelfScroller({ label, end, ariaLabel, headerClassName = "", listClassName = "", children }: Props) {
  const { lang } = usePrefs();
  const id = useId();
  const ref = useRef<HTMLUListElement>(null);
  const { atStart, atEnd, overflows } = useScrollEnds(ref, Children.count(children));
  const fade = !overflows ? "none" : !atStart && !atEnd ? "both" : !atStart ? "left" : !atEnd ? "right" : "none";

  /** One poster, or a screen minus one poster, so the last one you saw stays in view. */
  function move(dir: 1 | -1, page: boolean) {
    const el = ref.current;
    if (!el) return;
    const item = el.firstElementChild as HTMLElement | null;
    const one = (item?.offsetWidth ?? 0) + (parseFloat(getComputedStyle(el).columnGap) || 0);
    el.scrollBy({ left: dir * (page ? Math.max(one, el.clientWidth - one) : one), behavior: reduced() ? "auto" : "smooth" });
  }
  function onKey(e: KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    move(e.key === "ArrowRight" ? 1 : -1, false);
  }

  const nav = "label inline-flex size-7 items-center justify-center border-2 border-paper hover:bg-paper hover:text-shelf disabled:opacity-30 disabled:pointer-events-none";
  return (
    <>
      {(label || end || overflows) && (
        <div className={`flex items-center justify-between gap-4 ${headerClassName}`}>
          {label}
          <div className="flex shrink-0 items-center gap-4">
            {end}
            {overflows && (
              <div className="shelf-nav gap-1" data-testid="shelf-nav">
                <button type="button" className={nav} aria-controls={id} aria-label={t(lang, "shelf.prev")} disabled={atStart} onClick={() => move(-1, true)}>{"◀︎"}</button>
                <button type="button" className={nav} aria-controls={id} aria-label={t(lang, "shelf.next")} disabled={atEnd} onClick={() => move(1, true)}>{"▶︎"}</button>
              </div>
            )}
          </div>
        </div>
      )}
      <ul
        ref={ref}
        id={id}
        tabIndex={0}
        aria-label={ariaLabel}
        onKeyDown={onKey}
        data-testid="shelf-list"
        className={`no-scrollbar snap-items relative flex snap-x snap-mandatory gap-4 overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-label ${FADE[fade]} ${listClassName}`}
      >
        {children}
      </ul>
    </>
  );
}
