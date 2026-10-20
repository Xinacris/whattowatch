import { describe, expect, it } from "vitest";
import { likesNeeded, roundState, type RoundState, type TitleKey, type Vote } from "../src";

/** "LLN S" → like, like, nope, seen on the first cards of the deck; `extra` unvoted cards after. */
function deck(seq: string, extra = 10): { votes: Record<string, Vote>; keys: TitleKey[] } {
  const codes = seq.replace(/\s/g, "");
  const keys = Array.from({ length: codes.length + extra }, (_, i) => `m${i + 1}` as TitleKey);
  const map: Record<string, Vote> = { L: "like", N: "nope", S: "seen" };
  const votes = Object.fromEntries([...codes].map((c, i) => [keys[i], map[c]]));
  return { votes, keys };
}

const N = (n: number) => "N".repeat(n);

const table: [string, string, number, boolean, Partial<RoundState>][] = [
  ["fresh deck", "", 20, false, { phase: "swiping", voted: 0, target: 10, need: 3, nextSize: 10 }],
  ["3 of 10 is enough", "LLL" + N(7), 10, false, { phase: "done", reason: "ratio", liked: 3, voted: 10 }],
  ["2 of 10 deals 5 more", "LL" + N(8), 10, false, { phase: "extend", target: 15, need: 5, nextSize: 5 }],
  ["undo the 10th vote: back in round one", "LL" + N(7), 10, false, { phase: "swiping", target: 10, nextSize: 1 }],
  ["a like on card 11 doesn't end round two early", "LL" + N(8) + "L", 10, false, { phase: "swiping", target: 15, liked: 3 }],
  ["5 of 15", "LL" + N(8) + "LLLNN", 10, false, { phase: "done", reason: "ratio", voted: 15 }],
  ["4 of 15 deals again", "LL" + N(8) + "LLNNN", 10, false, { phase: "extend", target: 20, need: 6 }],
  ["seen it doesn't count as a vote", "SSSSS LLL" + N(7), 10, false, { phase: "done", voted: 10, liked: 3 }],
  ["seen it mid-round keeps the round at 10 votes", "LS" + N(4), 10, false, { phase: "swiping", voted: 5, nextSize: 5 }],
  ["cap with one like: send anyway", "L" + N(29), 5, false, { phase: "done", reason: "cap", voted: 30, target: 30 }],
  ["cap with zero likes", N(30), 5, false, { phase: "capped-empty", reason: "cap" }],
  ["8 of 25 is enough", "LL" + N(8) + "LL" + N(3) + "L" + N(4) + "LLL" + N(2), 5, false, { phase: "done", voted: 25, liked: 8 }],
  ["short shelf: the rule uses what's there", "LL" + N(4), 0, true, { phase: "done", reason: "end", voted: 6, need: 2 }],
  ["short shelf, all nopes", N(6), 0, true, { phase: "capped-empty", reason: "end" }],
  ["seen it on everything until TMDB runs out", "S".repeat(40), 0, true, { phase: "capped-empty", reason: "end", voted: 0 }],
  ["short shelf still loading isn't the end", "LL" + N(4), 0, false, { phase: "swiping", voted: 6 }],
];

describe("roundState", () => {
  it.each(table)("%s", (_name, seq, extra, deckDone, expected) => {
    const { votes, keys } = deck(seq, extra);
    expect(roundState(votes, keys, deckDone)).toMatchObject(expected);
  });
  it("thresholds: ceil(0.3 × voted)", () => {
    expect([10, 15, 20, 25, 30].map(likesNeeded)).toEqual([3, 5, 6, 8, 9]);
  });
});

/** Every state on the way through `seq`, one swipe at a time. */
function replay(seq: string, extra = 40) {
  const { votes, keys } = deck(seq, extra);
  return keys.slice(0, seq.replace(/\s/g, "").length + 1).map((_, n) => {
    const upTo = Object.fromEntries(Object.entries(votes).filter(([k]) => keys.indexOf(k as TitleKey) < n));
    return roundState(upTo, keys);
  });
}

describe("counter bugs seen on production", () => {
  // (a) "NEED 9" on the tape while the round ended at 6: the tape and the round used two different numbers.
  it.each(["LLL", "LLLLL", "NNLLNLL", "N".repeat(14) + "LLLLL", "N".repeat(12) + "LLL" + "N".repeat(8) + "LLL", "L" + "N".repeat(28) + "L"])(
    "the target on the tape ends the round the moment it's reached: %s", (seq) => {
      for (const r of replay(seq)) {
        if (r.liked >= r.need) expect(r.phase).toBe("done");
        if (r.phase === "done" && r.reason !== "cap" && r.reason !== "end") expect(r.liked).toBe(r.need);
      }
    });
  // (b) "LIKED 0 · CARD 11": yeses on series cards dropped out of the count once the deck came back regrouped.
  it("yeses on series cards still count when a reload regroups the deck", () => {
    const votes: Record<string, Vote> = { "c:1": "like", "c:2": "like", "c:3": "like" };
    const nopes = Array.from({ length: 7 }, (_, i) => `m${10 + i}` as TitleKey);
    nopes.forEach((k) => { votes[k] = "nope"; });
    const keys = ["m101", "m102", "m201", ...nopes, "m30", "m31", "m32", "m33", "m34", "m35"] as TitleKey[];
    expect(roundState(votes, keys)).toMatchObject({ liked: 3, voted: 10 });
  });
});
