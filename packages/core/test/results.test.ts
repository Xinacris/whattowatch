import { describe, expect, it } from "vitest";
import { matchesFromVoters, seriesLookup, seriesParts, voterLabels, type CollectionKey, type ItemKey, type TitleKey } from "../src";

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

describe("a seen-it on one film counts for its series (#5)", () => {
  const seriesOf = (k: ItemKey): CollectionKey | null => (k === "m120" || k === "m121" ? "c:119" : null);
  const deck: ItemKey[] = ["c:119", "m120", "m603"];
  const v = (likes: ItemKey[], seen: ItemKey[] = []) => ({ likes, seen });
  it.each([
    ["A likes the series, B saw one part: the series is out", [v(["c:119", "m603"]), v(["c:119", "m603"], ["m120"])], ["m603"]],
    ["both like the series: it's in", [v(["c:119"]), v(["c:119"])], ["c:119"]],
    ["a yes on a part still lifts to the series", [v(["m120"]), v(["c:119"])], ["c:119"]],
    ["seen on the series card itself", [v(["c:119"]), v(["c:119"], ["c:119"])], []],
  ] as const)("%s", (_name, voters, want) => {
    expect(matchesFromVoters(deck, voters, seriesOf)).toEqual(want);
  });
  it("no series card in the deck: a seen part only takes out that part", () => {
    expect(matchesFromVoters(["m120", "m121"], [v(["m120", "m121"]), v(["m120", "m121"], ["m120"])], seriesOf)).toEqual(["m121"]);
  });
  it("an old v2 link: series from the loaded cards' partOf", () => {
    const lookup = seriesLookup([{ key: "m120", partOf: { id: 119, name: "Shrek" } }, { key: "m603" }]);
    expect(matchesFromVoters(deck, [v(["c:119", "m603"]), v(["c:119", "m603"], ["m120"])], lookup)).toEqual(["m603"]);
  });
  it("which deck cards need loading to know their series: movies, only when the deck holds a series card", () => {
    expect(seriesParts(["c:119", "m120", "t5", "m603"])).toEqual(["m120", "m603"]);
    expect(seriesParts(["m120", "t5"])).toEqual([]);
  });
});
