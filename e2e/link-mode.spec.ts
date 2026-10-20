import { expect, test } from "@playwright/test";
import { counter, finalSwipe, person, setUpNight, sitDown, swipeRun } from "./helpers";

test("(a) 2 of 10 deals five more; 5 of 15 opens the share screen", async ({ browser }) => {
  const a = await person(browser);
  await setUpNight(a, "Ayşe", "Pass a link");
  await expect(counter(a)).toHaveText(/Liked 0 \/ need 3 · card 1 of 10/i);
  await swipeRun(a, "LLNNNNNNN");
  await expect(a.getByTestId("share")).toHaveCount(0); // never mid-round
  await swipeRun(a, "N"); // 10th vote: 2 of 10 isn't enough
  await expect(a.getByTestId("round-banner")).toBeVisible();
  await expect(counter(a)).toHaveText(/Liked 2 \/ need 5 · card 11 of 15/i);
  await swipeRun(a, "LLLN");
  await finalSwipe(a, "ArrowLeft");
  await expect(a.getByTestId("share-screen")).toContainText("You said yes to 5.");
});

test("(b) 3 of 10 shares at once; the friend gets exactly those cards, no pop-ups, then results", async ({ browser }) => {
  const a = await person(browser);
  await setUpNight(a, "Ayşe", "Pass a link");
  const deck = [...(await swipeRun(a, "LSLLNNNNNN")), await finalSwipe(a, "ArrowLeft")]; // 10 votes + 1 seen it
  await expect(a.getByTestId("share-screen")).toContainText("You said yes to 3.");
  const link = await a.getByTestId("share-url").inputValue();
  await a.getByTestId("share").click();
  const seen = deck[1];
  const voted = deck.filter((t) => t !== seen); // seen it isn't in the friend's deck

  // Initiator opening their own link: waiting, not a second deck.
  await a.reload();
  await expect(a.getByText("Done. Waiting on your friend.")).toBeVisible();

  const b = await person(browser);
  await b.goto(link);
  await expect(b.getByRole("heading", { name: /Ayşe already swiped/ })).toBeVisible();
  await sitDown(b, "Burak");
  await expect(counter(b)).toHaveText(/card 1 of 10/i);
  const got = await swipeRun(b, "NLLLNNNNN");
  await expect(b.getByRole("dialog")).toHaveCount(0);
  got.push(await finalSwipe(b, "ArrowLeft"));
  expect(got).toEqual(voted);
  await expect(b.getByRole("heading", { name: "You both said yes to these." })).toBeVisible();
  const results = b.getByTestId("result");
  await expect(results).toHaveCount(2);
  await expect(results.nth(0)).toContainText(voted[1]!);
  await expect(results.nth(1)).toContainText(voted[2]!);

  // Send results back: opens straight to results for the initiator.
  const back = await b.getByTestId("send-back").getAttribute("data-url");
  await a.goto(back!);
  await expect(a.getByTestId("result")).toHaveCount(2);
  await expect(a.getByTestId("round-counter")).toHaveCount(0);
});

test("(c) zero overlap gets an honest empty state", async ({ browser }) => {
  const a = await person(browser);
  await setUpNight(a, "Ayşe", "Pass a link");
  await swipeRun(a, "LLLNNNNNN");
  await finalSwipe(a, "ArrowLeft");
  const link = await a.getByTestId("share-url").inputValue();

  const b = await person(browser);
  await b.goto(link);
  await sitDown(b, "Burak");
  await swipeRun(b, "NNNLLLLLL");
  await finalSwipe(b, "ArrowRight");
  await expect(b.getByRole("heading", { name: "Zero overlap. Impressive, honestly." })).toBeVisible();
  await expect(b.getByRole("button", { name: "You go first" })).toBeVisible();
  await expect(b.getByRole("link", { name: "Loosen filters" })).toBeVisible();
  await expect(b.getByTestId("send-back")).toHaveCount(0); // behind "More"
  await expect(b.getByTestId("results")).not.toContainText(/your turn/i);
  await b.getByTestId("more").click();
  await expect(b.getByTestId("send-back")).toBeVisible();
});

test("(d) a v1 link still opens and deals the friend ten cards", async ({ browser }) => {
  // Made by the v1 encoder: movies, any era, US, no filters, seed "k3x9pq2m", Çağla liked m550 and m603.
  const v1 = "AQAAVVMAAAAIazN4OXBxMm0BB8OHYcSfbGECzAhqAA";
  const b = await person(browser);
  await b.goto(`/match/link?d=${v1}`);
  await expect(b.getByRole("heading", { name: /Çağla already swiped/ })).toBeVisible();
  await sitDown(b, "Burak");
  await expect(counter(b)).toHaveText(/card 1 of 10/i);
});

test("a chewed-up link says so and offers a new night", async ({ page }) => {
  await page.goto("/match/link?d=AgAB");
  await expect(page.getByText("This tape is chewed up.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Start movie night/ })).toBeVisible();
});
