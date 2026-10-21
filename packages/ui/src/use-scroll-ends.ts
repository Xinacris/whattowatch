"use client";
import { useEffect, useState, type RefObject } from "react";

export interface ScrollEnds { atStart: boolean; atEnd: boolean; overflows: boolean }

const FITS: ScrollEnds = { atStart: true, atEnd: true, overflows: false };
/** No IntersectionObserver: assume there's more both ways; scrollBy clamps at the ends anyway. */
const UNKNOWN: ScrollEnds = { atStart: false, atEnd: false, overflows: true };

/**
 * Whether a horizontal list is at its start or end, from an IntersectionObserver on its first and
 * last item. No scroll listener, no layout reads. `count` re-arms it when the items change.
 */
export function useScrollEnds(ref: RefObject<HTMLElement | null>, count: number): ScrollEnds {
  const [ends, setEnds] = useState<ScrollEnds>(FITS);
  useEffect(() => {
    const el = ref.current;
    const first = el?.firstElementChild;
    const last = el?.lastElementChild;
    if (!el || !first || !last) return;
    if (typeof IntersectionObserver === "undefined") { queueMicrotask(() => setEnds(UNKNOWN)); return; }
    const visible = new Map<Element, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) visible.set(e.target, e.intersectionRatio >= 0.95);
      const atStart = visible.get(first) ?? false;
      const atEnd = visible.get(last) ?? false;
      setEnds({ atStart, atEnd, overflows: !(atStart && atEnd) });
    }, { root: el, threshold: [0, 0.95, 1] });
    io.observe(first);
    io.observe(last);
    return () => io.disconnect();
  }, [ref, count]);
  return ends;
}
