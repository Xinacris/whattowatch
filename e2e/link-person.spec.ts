import { expect, test, type Page } from "@playwright/test";
import { encodeLink, freshLink, sanitizeFilters, type ItemKey } from "../packages/core/src";
import { counter, finalSwipe, person, setUpNight, sitDown, swipeRun } from "./helpers";

// #6: two people on one browser can both vote a link; a name is the same person however it's typed;
// progress stored before names were part of the key still loads for the person who made it.

test("(a) one browser, two names: both swipe, both reach the results", async ({ browser }) => {
  const p = await person(browser);
  await setUpNight(p, "Ayşe", "Pass a link");
  const deck = [...(await swipeRun(p, "LLLL")), await finalSwipe(p, "ArrowRight")];
  await expect(p.getByTestId("share-screen")).toContainText("You said yes to 5.");
  await p.getByTestId("pass-phone").click();

  await expect(p.getByRole("heading", { name: "Who's swiping now?" })).toBeVisible();
  await sitDown(p, "Burak");
  await expect(counter(p)).toHaveText(/card 1 of 5/i);
  await swipeRun(p, "LNLN");
  await finalSwipe(p, "ArrowLeft");
  const results = p.getByTestId("result");
  await expect(results).toHaveCount(2);
  await expect(results.nth(0)).toContainText(deck[0]!);
  await expect(results.nth(1)).toContainText(deck[2]!);
  await expect(p.getByText(/Ayşe and Burak/)).toBeVisible();

  // Back to Ayşe, typed differently: she already swiped, so she lands on the same results.
  await p.getByTestId("pass-phone").click();
  await sitDown(p, "  ayşe ");
  await expect(p.getByText("ayşe already swiped this one.")).toBeVisible();
  await expect(p.getByTestId("swipe-again")).toHaveText("Swipe again as ayşe →");
  await p.getByRole("button", { name: "Back" }).click();
  await expect(p.getByTestId("result")).toHaveCount(2);
  await p.reload();
  await expect(p.getByTestId("result")).toHaveCount(2);
});

test("(b) swipe again as the same person replaces their picks, it doesn't add a third voter", async ({ browser }) => {
  const p = await person(browser);
  await setUpNight(p, "Ayşe", "Pass a link");
  await swipeRun(p, "LLLL");
  await finalSwipe(p, "ArrowRight");
  await p.getByTestId("pass-phone").click();
  await sitDown(p, "Burak");
  await swipeRun(p, "NNNN");
  await finalSwipe(p, "ArrowLeft");
  await p.getByTestId("pass-phone").click();
  await sitDown(p, "BURAK");
  await p.getByTestId("swipe-again").click();
  await expect(counter(p)).toHaveText(/card 1 of 5/i);
  await swipeRun(p, "LLLL");
  await finalSwipe(p, "ArrowRight");
  await expect(p.getByTestId("result")).toHaveCount(5);
  await expect(p.getByText(/Ayşe and BURAK/)).toBeVisible();
});

test("(c) TR letters: İLKER and ilker are one person", async ({ browser }) => {
  const p = await person(browser);
  await setUpNight(p, "İLKER", "Pass a link");
  await swipeRun(p, "LLLL");
  await finalSwipe(p, "ArrowRight");
  await p.getByTestId("pass-phone").click();
  await sitDown(p, "ilker");
  await expect(p.getByText("ilker already swiped this one.")).toBeVisible();
});

async function seedStorage(p: Page, local: Record<string, string>, session: Record<string, string> = {}) {
  await p.goto("/match/new");
  await p.evaluate(([l, s]) => {
    for (const [k, v] of Object.entries(l!)) localStorage.setItem(k, v);
    for (const [k, v] of Object.entries(s!)) sessionStorage.setItem(k, v);
  }, [local, session] as const);
}

test("(d) a seed-only \"already swiped\" marker from before still means waiting for its owner, and only for them", async ({ browser }) => {
  const filters = sanitizeFilters({});
  const link = `/match/link?d=${encodeLink({ filters, seed: "old6a", deck: ["m603", "m13"] as ItemKey[], voters: [{ name: "Ayşe", likes: ["m603"], seen: [] }], finished: false })}`;
  const p = await person(browser);
  await seedStorage(p, { "wtw.viewer.name": "Ayşe", "wtw.link.voted.old6a": "1" });
  await p.goto(link);
  await expect(p.getByText("Done. Waiting on your friend.")).toBeVisible();
  expect(await p.evaluate(() => localStorage.getItem("wtw.link.voted.old6a"))).toBeNull(); // moved, once
  await p.reload();
  await expect(p.getByText("Done. Waiting on your friend.")).toBeVisible();
  await p.getByTestId("pass-phone").click();
  await sitDown(p, "Burak");
  await expect(counter(p)).toHaveText(/card 1 of 2/i);
});

test("(e) seed-only swipes from before load for their voter mid-deck", async ({ browser }) => {
  const filters = sanitizeFilters({});
  const deck = ["m603", "m13", "m278"] as ItemKey[];
  const link = `/match/link?d=${encodeLink({ filters, seed: "old6b", deck, voters: [{ name: "Ayşe", likes: deck, seen: [] }], finished: false })}`;
  const p = await person(browser);
  await seedStorage(p, { "wtw.viewer.name": "Burak" }, { "wtw.link.old6b": JSON.stringify({ m603: "like" }) });
  await p.goto(link);
  await expect(counter(p)).toHaveText(/card 2 of 3/i);
});

test("(f) a fresh link still asks the first person's name and starts at card 1", async ({ browser }) => {
  const p = await person(browser);
  await p.goto(`/match/link?d=${freshLink(sanitizeFilters({}), "fresh6")}`);
  await sitDown(p, "Ayşe");
  await expect(counter(p)).toHaveText(/card 1 of 15/i);
});
