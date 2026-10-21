import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { Poster, ShelfScroller } from "@wtw/ui";
import { render, sleep, unmount } from "./render";

// The v2.4 shelf in a real browser with the real CSS, covering what v2.4 left untested end to end:
// a row that fits, a poster with no image, an empty row.

afterEach(unmount);

const posters = (n: number, src: (i: number) => string | null = () => null) =>
  Array.from({ length: n }, (_, i) => (
    <li key={i} className="w-36 shrink-0" data-i={i}>
      <Poster src={src(i)} title={`Film ${i + 1}`} lang="en" />
    </li>
  ));

const list = (host: HTMLElement) => host.querySelector<HTMLUListElement>('[data-testid="shelf-list"]')!;
const nav = (host: HTMLElement) => host.querySelector('[data-testid="shelf-nav"]');
const settled = async (el: HTMLElement) => { let last = -1; for (let n = 0; n < 30 && el.scrollLeft !== last; n++) { last = el.scrollLeft; await sleep(100); } };

describe("ShelfScroller", () => {
  it("a row that overflows: buttons, prev disabled at the start, a fade on the right only", async () => {
    const host = await render(<ShelfScroller label={<h2>Row</h2>} ariaLabel="Row">{posters(12)}</ShelfScroller>, { width: 700 });
    await vi.waitFor(() => expect(nav(host)).not.toBeNull());
    expect(getComputedStyle(nav(host)!).display).not.toBe("none"); // a fine pointer
    const [prev, next] = [...nav(host)!.querySelectorAll("button")];
    expect(prev!.disabled).toBe(true);
    expect(next!.disabled).toBe(false);
    expect(list(host).className).toMatch(/\bfade-right\b/);
    await userEvent.click(next!);
    await settled(list(host));
    expect(list(host).scrollLeft).toBeGreaterThan(0);
    await vi.waitFor(() => expect(list(host).className).toMatch(/\bfade-both\b/));
  });

  it("a row that fits: no buttons, no fade", async () => {
    const host = await render(<ShelfScroller label={<h2>Short</h2>} ariaLabel="Short">{posters(3)}</ShelfScroller>, { width: 900 });
    await sleep(150);
    expect(list(host).scrollWidth).toBeLessThanOrEqual(list(host).clientWidth);
    expect(nav(host)).toBeNull();
    expect(list(host).className).not.toMatch(/fade-/);
    expect(host.textContent).toContain("Short");
  });

  it("a poster with no image: the tape-case fallback renders, sized like the others, and snaps", async () => {
    const img = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='2' height='3'/>";
    const host = await render(<ShelfScroller ariaLabel="Mixed">{posters(10, (i) => (i === 4 ? null : img))}</ShelfScroller>, { width: 600 });
    const items = [...list(host).querySelectorAll("li")];
    const fallback = items[4]!;
    expect(fallback.textContent).toContain("No cover art");
    expect(fallback.textContent).toContain("Film 5");
    await vi.waitFor(() => expect(Math.round(fallback.getBoundingClientRect().height)).toBe(Math.round(items[3]!.getBoundingClientRect().height)));
    expect(getComputedStyle(fallback).scrollSnapAlign).toMatch(/start/);
    list(host).scrollTo({ left: fallback.offsetLeft - 20, behavior: "instant" });
    await settled(list(host));
    const off = fallback.getBoundingClientRect().left - list(host).getBoundingClientRect().left - (parseFloat(getComputedStyle(list(host)).scrollPaddingLeft) || 0);
    expect(Math.abs(off)).toBeLessThan(2); // snapped to the fallback's start, as any poster would
  });

  it("an empty row renders nothing, not even its heading", async () => {
    const host = await render(<ShelfScroller label={<h2>Nothing</h2>} end={<a href="/search">See all</a>} ariaLabel="Nothing">{[]}</ShelfScroller>);
    expect(host.innerHTML).toBe("");
  });

  it("the heading row never wraps the heading: at 343px the buttons drop below it", async () => {
    const host = await render(<ShelfScroller label={<h2 className="display text-3xl">Under 100 minutes</h2>} end={<a className="label">See all →</a>} ariaLabel="Row">{posters(8)}</ShelfScroller>, { width: 343 });
    await vi.waitFor(() => expect(nav(host)).not.toBeNull());
    const h = host.querySelector("h2")!;
    const lh = parseFloat(getComputedStyle(h).lineHeight);
    expect(h.getBoundingClientRect().height).toBeLessThanOrEqual(lh + 1);
    expect(nav(host)!.getBoundingClientRect().top).toBeGreaterThanOrEqual(h.getBoundingClientRect().bottom - 1);
  });
});
