import { describe, expect, it } from "vitest";
import { matchesFromVoters, voterLabels, type TitleKey } from "../src";

const deck: TitleKey[] = ["m3", "t2", "m1", "m9"];

describe("results", () => {
  it("everyone's yes, in deck order", () => {
    const a = { likes: ["m1", "m3", "m9"] as TitleKey[], seen: [] };
    const b = { likes: ["m9", "m3"] as TitleKey[], seen: [] };
    expect(matchesFromVoters(deck, [a, b])).toEqual(["m3", "m9"]);
  });
  it("one voter has no results; seen it takes a title out", () => {
    const a = { likes: deck, seen: [] };
    expect(matchesFromVoters(deck, [a])).toEqual([]);
    expect(matchesFromVoters(deck, [a, { likes: deck, seen: ["m3"] as TitleKey[] }])).toEqual(["t2", "m1", "m9"]);
  });
  it("a third person narrows it", () => {
    const all = { likes: deck, seen: [] };
    expect(matchesFromVoters(deck, [all, all, { likes: ["m1"] as TitleKey[], seen: [] }])).toEqual(["m1"]);
  });
  it("tells two people with the same name apart", () => {
    expect(voterLabels(["Ali", "ali ", "Zeynep", "ALI"])).toEqual(["Ali", "ali", "Zeynep", "ALI (3)"].map((n, i) => (i === 1 ? "ali (2)" : n)));
  });
});
