import { afterEach, describe, expect, it } from "vitest";
import { RoundCounter } from "@/components/round-counter";
import { render, unmount } from "./render";

afterEach(unmount);

describe("RoundCounter", () => {
  it.each([
    ["en", { card: 1, of: 15, liked: 0 }, "Liked 0 / 5 · card 1 of 15"],
    ["en", { card: 16, of: 20, liked: 4 }, "Liked 4 / 5 · card 16 of 20"],
    ["en", { card: 3, of: 7 }, "card 3 of 7"],
    ["tr", { card: 2, of: 15, liked: 1 }, "1 / 5 beğeni · kart 2 / 15"],
    ["tr", { card: 3, of: 7 }, "Kart 3 / 7"],
  ] as const)("%s %j", async (lang, props, want) => {
    const host = await render(<RoundCounter {...props} />, { lang });
    const el = host.querySelector('[data-testid="round-counter"]')!;
    expect(el.getAttribute("role")).toBe("status");
    expect(el.textContent).toMatch(new RegExp(want.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  });
});
