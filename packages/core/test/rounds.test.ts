import { describe, expect, it } from "vitest";
import { LIKE_TARGET, roomTape, roundSize, roundState, tapeText, votedKeys, type ItemKey, type RoundState, type TitleKey, type Vote } from "../src";

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
  ["fresh deck", "", 20, false, { phase: "swiping", voted: 0, need: 5, size: 15 }],
  ["5 likes in the first 5 cards: share right away", "LLLLL", 20, false, { phase: "done", reason: "likes", liked: 5, voted: 5 }],
  ["4 likes in the first 5: keep going", "LLLL N", 20, false, { phase: "swiping", liked: 4, size: 15 }],
  ["5th like on card 15", N(10) + "LLLL L", 20, false, { phase: "done", reason: "likes", voted: 15, size: 20 }],
  ["4 likes after 15: five more", "LLLL" + N(11), 20, false, { phase: "extend", liked: 4, voted: 15, size: 20, need: 5 }],
  ["extension, two cards in: card 17 of 20", "LLLL" + N(13), 20, false, { phase: "swiping", voted: 17, size: 20 }],
  ["5th like mid-extension ends it", "LLLL" + N(13) + "L", 20, false, { phase: "done", reason: "likes", voted: 18 }],
  ["4 likes after 20: five more again", "LLLL" + N(16), 20, false, { phase: "extend", size: 25 }],
  ["4 likes after 30: send what's there", "LLLL" + N(26), 5, false, { phase: "done", reason: "cap", liked: 4, voted: 30, size: 30 }],
  ["0 likes after 30: loosen filters", N(30), 5, false, { phase: "capped-empty", reason: "cap", voted: 30 }],
  ["seen it where the 5th like would be doesn't count", "LLLL S", 20, false, { phase: "swiping", liked: 4, voted: 4 }],
  ["seen it doesn't count as a card", "SSSSS LLLLL", 20, false, { phase: "done", voted: 5, liked: 5 }],
  ["undo the 5th like: back in the deck with 4", "LLLL", 20, false, { phase: "swiping", liked: 4 }],
  ["short shelf: the round is whatever exists", "LL" + N(4), 0, true, { phase: "done", reason: "end", voted: 6 }],
  ["short shelf, all nopes", N(6), 0, true, { phase: "capped-empty", reason: "end" }],
  ["seen it on everything until TMDB runs out", "S".repeat(40), 0, true, { phase: "capped-empty", reason: "end", voted: 0 }],
  ["short shelf still loading isn't the end", "LL" + N(4), 0, false, { phase: "swiping", voted: 6 }],
];

describe("roundState", () => {
  it.each(table)("%s", (_name, seq, extra, deckDone, expected) => {
    const { votes, keys } = deck(seq, extra);
    expect(roundState(votes, keys, deckDone)).toMatchObject(expected);
  });
  it("round sizes: 15, then 20, 25, 30", () => {
    expect([0, 14, 15, 19, 20, 25, 29, 30, 40].map(roundSize)).toEqual([15, 15, 20, 20, 25, 30, 30, 30, 30]);
  });
  it("a yes on a series card counts like any other", () => {
    const keys = ["c:1", "m2", "c:3", "m4", "c:5", "m6", "c:7", "m8"] as ItemKey[];
    const votes: Record<string, Vote> = { "c:1": "like", m2: "nope", "c:3": "like", m4: "like", "c:5": "like", m6: "nope", "c:7": "like" };
    expect(roundState(votes, keys)).toMatchObject({ phase: "done", reason: "likes", liked: 5, voted: 7 });
    expect(votedKeys(keys, votes)).toEqual(["c:1", "m2", "c:3", "m4", "c:5", "m6", "c:7"]);
  });
  it("the tape reads LIKE_TARGET, in both languages", () => {
    expect(tapeText("en", { liked: 3, card: 8, of: 15 })).toBe(`Liked 3 / ${LIKE_TARGET} · card 8 of 15`);
    expect(tapeText("tr", { liked: 3, card: 8, of: 15 })).toBe(`3 / ${LIKE_TARGET} beğeni · kart 8 / 15`);
    expect(tapeText("en", { card: 4, of: 5 })).toBe("Card 4 of 5");
  });
});

describe("live room tape", () => {
  it("counts this member's yeses and where they are, and says when the room grew", () => {
    const deck = Array.from({ length: 20 }, (_, i) => `m${i + 1}` as ItemKey);
    const votes: Record<string, Vote> = Object.fromEntries(deck.slice(0, 15).map((k, i) => [k, i < 3 ? "like" : "nope"]));
    expect(roomTape(deck, votes)).toEqual({ liked: 3, card: 16, of: 20, grew: true });
  });
});

/** Every state on the way through `seq`, one swipe at a time. */
function replay(seq: string, extra = 40) {
  const { votes, keys } = deck(seq, extra);
  const states: RoundState[] = [];
  for (let n = 0; n <= seq.replace(/\s/g, "").length; n++) {
    const r = roundState(Object.fromEntries(Object.entries(votes).filter(([k]) => keys.indexOf(k as TitleKey) < n)), keys);
    states.push(r);
    if (r.phase === "done" || r.phase === "capped-empty") break; // the deck is gone once the round ends
  }
  return states;
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
