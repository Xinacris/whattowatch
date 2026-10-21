import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { DEFAULT_FILTERS, type DeckCard, type ItemKey } from "@wtw/core";
import { motion } from "@wtw/tokens";

// The swipe card's keyboard and button paths, through the real Deck and deck session (only the API is faked).
const card = (n: number): DeckCard => ({ key: `m${n}` as ItemKey, id: n, type: "movie", title: `Film ${n}`, year: 2000 + n, poster: null, rating: 7, overview: "", genreIds: [], runtime: 100, genreNames: [], providers: [], cast: [] });
vi.mock("@/lib/api", () => ({
  api: {
    deck: vi.fn(async () => ({ cards: [], done: true })),
    cards: vi.fn(async (keys: ItemKey[]) => keys.map((k) => card(Number(k.slice(1))))),
  },
}));

const { Deck } = await import("@/components/deck");
const { useDeck } = await import("@/lib/deck-store");
const { render, sleep, unmount } = await import("./render");

const onVote = vi.fn();
const onUndo = vi.fn();
const top = () => document.querySelector('[role="group"]')?.getAttribute("aria-label");
const flown = () => sleep(motion.flyOutMs + 80);

beforeEach(async () => {
  onVote.mockReset();
  onUndo.mockReset();
  useDeck.getState().start(DEFAULT_FILTERS, "seed", "en", {}, { keys: ["m1", "m2", "m3", "m4"] });
  await render(<Deck onVote={onVote} onUndo={onUndo} />);
  await vi.waitFor(() => expect(top()).toBe("Film 1"));
});
afterEach(unmount);

describe("Deck: keyboard", () => {
  it("→ yes, ← nope, ↑ seen it, each moving to the next card", async () => {
    for (const [key, vote, next] of [["{ArrowRight}", "like", "Film 2"], ["{ArrowLeft}", "nope", "Film 3"], ["{ArrowUp}", "seen", "Film 4"]] as const) {
      await userEvent.keyboard(key);
      await flown();
      expect(onVote).toHaveBeenLastCalledWith(expect.any(String), vote);
      expect(top()).toBe(next);
    }
    expect(onVote.mock.calls.map((c) => c[0])).toEqual(["m1", "m2", "m3"]);
  });
  it("Backspace undoes the last vote and brings the card back", async () => {
    await userEvent.keyboard("{ArrowRight}");
    await flown();
    await userEvent.keyboard("{Backspace}");
    await vi.waitFor(() => expect(top()).toBe("Film 1"));
    expect(onUndo).toHaveBeenCalledWith("m1");
  });
  it("typing in a text field never votes", async () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    await userEvent.keyboard("{ArrowRight}");
    await flown();
    expect(onVote).not.toHaveBeenCalled();
    input.remove();
  });
  it("a double press while the card is flying votes once", async () => {
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await flown();
    expect(onVote).toHaveBeenCalledTimes(1);
  });
});

describe("Deck: buttons", () => {
  const button = (name: RegExp) => [...document.querySelectorAll("button")].find((b) => name.test(b.textContent ?? ""))!;
  it("Yes, Nope and Seen it vote the top card", async () => {
    for (const [name, vote] of [[/Yes/, "like"], [/Nope/, "nope"], [/Seen it/, "seen"]] as const) {
      await userEvent.click(button(name));
      await flown();
      expect(onVote).toHaveBeenLastCalledWith(expect.any(String), vote);
    }
    expect(top()).toBe("Film 4");
  });
  it("Undo is disabled until there's something to undo", async () => {
    expect(button(/Undo/).disabled).toBe(true);
    await userEvent.click(button(/Nope/));
    await flown();
    expect(button(/Undo/).disabled).toBe(false);
    await userEvent.click(button(/Undo/));
    await vi.waitFor(() => expect(top()).toBe("Film 1"));
  });
  it("tapping the card flips it instead of voting", async () => {
    await userEvent.click(document.querySelector('[role="group"]')!);
    expect(onVote).not.toHaveBeenCalled();
    expect(document.querySelector('[role="group"]')?.textContent).toMatch(/No plot summary|Tap for the cover/);
  });
});
