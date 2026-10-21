import { describe, expect, it } from "vitest";
import { linkEntryKeys, voterKey, withoutVoter, withVoter, type LinkVoter } from "../src";

describe("the same person however the name is typed (#6)", () => {
  it.each([
    ["Ayşe", "ayşe "],
    ["  Ayşe  Nur ", "ayşe nur"],
    ["İLKER", "ilker"],
    ["IŞIK", "ışık"],
    ["ALI", "ali"], // an English keyboard's I
    ["IŞIK", "işik"], // dotted or not, one i: no couch has two people told apart only by that dot
    ["Ayşe", "Ayşe"], // decomposed ş
  ])("%j = %j", (a, b) => expect(voterKey(a)).toBe(voterKey(b)));
  it.each([
    ["Ayşe", "Ayse"],
    ["Ali", "Ali Can"],
  ])("%j ≠ %j", (a, b) => expect(voterKey(a)).not.toBe(voterKey(b)));
});

describe("link voters", () => {
  const v = (name: string, likes: string[] = []): LinkVoter => ({ name, likes: likes as LinkVoter["likes"], seen: [] });
  it("swiping again replaces your picks, a new name adds a voter", () => {
    expect(withVoter([v("Ayşe", ["m1"]), v("Burak")], v("ayşe ", ["m2"]))).toEqual([v("Burak"), v("ayşe ", ["m2"])]);
    expect(withVoter([v("Ayşe")], v("Burak"))).toEqual([v("Ayşe"), v("Burak")]);
    expect(withoutVoter([v("Ayşe"), v("Burak")], "AYŞE")).toEqual([v("Burak")]);
  });
});

describe("where link progress is stored", () => {
  it("one key per seed and person, whatever the spelling", () => {
    const a = linkEntryKeys("progress", "seed1", "Ayşe", "Ayşe").key;
    expect(linkEntryKeys("progress", "seed1", " ayşe", "Ayşe").key).toBe(a);
    expect(linkEntryKeys("progress", "seed1", "Burak", "Ayşe").key).not.toBe(a);
    expect(linkEntryKeys("progress", "seed2", "Ayşe", "Ayşe").key).not.toBe(a);
    expect(linkEntryKeys("voted", "seed1", "Ayşe", "Ayşe").key).not.toBe(a);
    expect(a).toMatch(/^[\w.-]+$/); // SecureStore and localStorage safe
  });
  it("the old seed-only entry belongs to the device's remembered name, nobody else", () => {
    expect(linkEntryKeys("voted", "seed1", "ayşe", "Ayşe").legacy).toBe("wtw.link.voted.seed1");
    expect(linkEntryKeys("progress", "seed1", "Ayşe", "Ayşe").legacy).toBe("wtw.link.seed1");
    expect(linkEntryKeys("voted", "seed1", "Burak", "Ayşe").legacy).toBeNull();
    expect(linkEntryKeys("voted", "seed1", "Burak", "").legacy).toBe("wtw.link.voted.seed1"); // nobody remembered: first to read claims it
  });
});
