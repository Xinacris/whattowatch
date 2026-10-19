import { describe, expect, it } from "vitest";
import { currentMatches, isMatch, recordMatches, shortlist, type Ballot } from "../src";

const ballots: Record<string, Ballot> = {
  a: { m1: "like", m2: "like", m3: "nope", t4: "like" },
  b: { m1: "like", m2: "nope", t4: "like" },
  c: { m1: "like", t4: "seen" },
};

describe("match rule", () => {
  it("needs every current member to like it", () => {
    expect(currentMatches(["a", "b"], ballots).sort()).toEqual(["m1", "t4"]);
    expect(isMatch("m2", ["a", "b"], ballots)).toBe(false);
  });
  it("a seen-it from anyone in the room kills the match", () => {
    expect(isMatch("t4", ["a", "b"], ballots)).toBe(true);
    expect(isMatch("t4", ["a", "b", "c"], ballots)).toBe(false);
    expect(currentMatches(["a", "b", "c"], ballots)).toEqual(["m1"]);
  });
  it("member leaving mid-deck: rule uses whoever is still here", () => {
    const withLagger = { ...ballots, d: { m1: "nope" } as Ballot };
    expect(currentMatches(["a", "b", "d"], withLagger)).toEqual([]);
    expect(currentMatches(["a", "b"], { a: ballots.a!, b: ballots.b! }).sort()).toEqual(["m1", "t4"]);
  });
  it("a room of one never matches", () => {
    expect(currentMatches(["a"], ballots)).toEqual([]);
  });
});

describe("recording", () => {
  it("records each match once and keeps the first time", () => {
    const first = recordMatches([], ["m1"], 100);
    const again = recordMatches(first, ["m1", "t4"], 200);
    expect(again).toEqual([{ key: "m1", at: 100 }, { key: "t4", at: 200 }]);
    expect(shortlist(again)).toEqual(["m1", "t4"]);
  });
});
