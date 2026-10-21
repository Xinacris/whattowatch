import { describe, expect, it } from "vitest";
import { staffPick } from "../src";

const at = (rating: number | null, votes?: number) => ({ rating, ...(votes === undefined ? {} : { votes }) });

describe("staffPick", () => {
  it.each([
    ["empty list", [], -1],
    ["nothing has enough votes", [at(9, 10), at(8, 299)], -1],
    ["one qualifies", [at(9.5, 20), at(7.1, 4000), at(6, 100)], 1],
    ["tie: the earlier title wins", [at(6, 900), at(8.2, 500), at(8.2, 9000)], 1],
    ["a 9.6 from 40 votes loses to a 7.4 from 2,000", [at(9.6, 40), at(7.4, 2000)], 1],
    ["missing votes count as 0", [at(9.9), at(5, 300)], 1],
    ["a rated title with no rating value is skipped", [at(null, 5000), at(6.5, 301)], 1],
    ["best of several", [at(7, 400), at(8.8, 1200), at(8.1, 30000), at(8.9, 12)], 1],
  ] as const)("%s", (_name, items, want) => {
    expect(staffPick(items)).toBe(want);
  });
  it("minVotes is adjustable", () => {
    expect(staffPick([at(9, 50), at(7, 400)], { minVotes: 50 })).toBe(0);
  });
});
