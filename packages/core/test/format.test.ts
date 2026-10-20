import { describe, expect, it } from "vitest";
import { STRINGS, formatRuntime, guessRegion, makeRoomCode, normalizeRoomCode, t, listNames, yearOf } from "../src";

describe("format", () => {
  it("writes runtime like a tape label", () => {
    expect(formatRuntime(112)).toBe("1H 52M");
    expect(formatRuntime(45)).toBe("45M");
    expect(formatRuntime(120)).toBe("2H");
    expect(formatRuntime(0)).toBeNull();
    expect(formatRuntime(null)).toBeNull();
  });
  it("parses years defensively", () => {
    expect(yearOf("1999-03-31")).toBe(1999);
    expect(yearOf("")).toBeNull();
  });
});

describe("room codes", () => {
  it("never uses ambiguous characters", () => {
    for (let i = 0; i < 500; i++) expect(makeRoomCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
  it("normalizes typing and rejects typos", () => {
    expect(normalizeRoomCode(" abc-234 ")).toBe("ABC234");
    expect(normalizeRoomCode("ABC10O")).toBeNull();
    expect(normalizeRoomCode("ABC23")).toBeNull();
  });
});

describe("strings and region", () => {
  it("interpolates and keeps both languages", () => {
    expect(t("tr", "results.title")).toBe("Bunlarda anlaştınız.");
    expect(t("en", "title.noProviders", { region: "TR" })).toContain("TR");
    expect(listNames("tr", ["Ayşe", "Çağrı", "Işıl"])).toBe("Ayşe, Çağrı ve Işıl");
  });
  it("guesses region from header, then locale", () => {
    expect(guessRegion("tr", null)).toBe("TR");
    expect(guessRegion(null, "en-GB")).toBe("GB");
    expect(guessRegion(undefined, "tr")).toBe("US");
  });
});

describe("copy limits", () => {
  const words = (x: string) => x.replace(/\{\w+\}/g, "X").split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;
  const BUTTONS = ["landing.start", "landing.join", "share.button", "results.swap", "results.sendBack", "results.addPerson", "results.more", "deck.loosen", "capped.newDeck",
    "setup.create", "setup.createLink", "lobby.copy", "lobby.start", "join.cta", "filters.clear", "filters.done", "common.retry", "search.loadMore", "shortlist.newNight", "results.where"] as const;
  it.each(["en", "tr"] as const)("%s: buttons are three words at most", (lang) => {
    for (const k of BUTTONS) expect([k, words(t(lang, k))]).toEqual([k, Math.min(words(t(lang, k)), 3)]);
  });
  it.each(["en", "tr"] as const)("%s: \"your turn\" lives in one key only, never on a results screen", (lang) => {
    const hits = Object.keys(STRINGS[lang]).filter((k) => /your turn|sıra sende/i.test(STRINGS[lang][k as keyof (typeof STRINGS)["en"]]));
    expect(hits).toEqual(["link.yourTurn"]);
  });
});
