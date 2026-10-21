import { expect, test } from "@playwright/test";
import { counter, finalSwipe, person, setUpNight, sitDown, swipeRun } from "./helpers";

test("(a) 4 yeses after 15 deals five more; the 5th yes opens the share screen mid-round; undo goes back with 4", async ({ browser }) => {
  const a = await person(browser);
  await setUpNight(a, "Ayşe", "Pass a link");
  await expect(counter(a)).toHaveText(/Liked 0 \/ 5 · card 1 of 15/i);
  await swipeRun(a, "LLLNNNN");
  await expect(counter(a)).toHaveText(/Liked 3 \/ 5 · card 8 of 15/i);
  await swipeRun(a, "LNNNNNNN"); // 15th card: 4 yeses isn't five
  await expect(a.getByTestId("share")).toHaveCount(0);
  await expect(a.getByTestId("round-banner")).toHaveText("Five more.");
  await expect(counter(a)).toHaveText(/Liked 4 \/ 5 · card 16 of 20/i);
  await swipeRun(a, "N");
  await expect(counter(a)).toHaveText(/Liked 4 \/ 5 · card 17 of 20/i);
  await finalSwipe(a, "ArrowRight"); // 5th yes on card 17: no waiting for card 20
  await expect(a.getByTestId("share-screen")).toContainText("You said yes to 5.");
  await a.getByRole("button", { name: /Undo/ }).click();
  await expect(counter(a)).toHaveText(/Liked 4 \/ 5 · card 17 of 20/i);
});

test("(b) five yeses share at once; the friend gets exactly the voted cards, no pop-ups, then results", async ({ browser }) => {
  const a = await person(browser);
  await setUpNight(a, "Ayşe", "Pass a link");
  const deck = [...(await swipeRun(a, "LSLLNNL")), await finalSwipe(a, "ArrowRight")]; // 7 votes + 1 seen it
  await expect(a.getByTestId("share-screen")).toContainText("You said yes to 5.");
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
  await expect(counter(b)).toHaveText(/card 1 of 7/i);
  const got = await swipeRun(b, "NLLNNN");
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

test("(c) a five-card friend deck (yes to the first five) ends in the right results", async ({ browser }) => {
  const a = await person(browser);
  await setUpNight(a, "Ayşe", "Pass a link");
  const deck = [...(await swipeRun(a, "LLLL")), await finalSwipe(a, "ArrowRight")];
  const link = await a.getByTestId("share-url").inputValue();

  const b = await person(browser);
  await b.goto(link);
  await sitDown(b, "Burak");
  await expect(counter(b)).toHaveText(/card 1 of 5/i);
  await swipeRun(b, "LNLN");
  await finalSwipe(b, "ArrowLeft");
  const results = b.getByTestId("result");
  await expect(results).toHaveCount(2);
  await expect(results.nth(0)).toContainText(deck[0]!);
  await expect(results.nth(1)).toContainText(deck[2]!);
});

test("(c2) zero overlap gets an honest empty state", async ({ browser }) => {
  const a = await person(browser);
  await setUpNight(a, "Ayşe", "Pass a link");
  await swipeRun(a, "LLLL");
  await finalSwipe(a, "ArrowRight");
  const link = await a.getByTestId("share-url").inputValue();

  const b = await person(browser);
  await b.goto(link);
  await sitDown(b, "Burak");
  await swipeRun(b, "NNNN");
  await finalSwipe(b, "ArrowLeft");
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

test("(e) v2.6: link results survive opening a title and coming back, and reopening the page", async ({ browser }) => {
  const a = await person(browser);
  await setUpNight(a, "Ayşe", "Pass a link");
  const deck = [...(await swipeRun(a, "LLLL")), await finalSwipe(a, "ArrowRight")];
  const link = await a.getByTestId("share-url").inputValue();
  const b = await person(browser);
  await b.goto(link);
  await sitDown(b, "Burak");
  await swipeRun(b, "LLLN");
  await finalSwipe(b, "ArrowLeft");
  const names = b.getByTestId("result").locator("p.display");
  await expect(names).toHaveCount(3);
  const shared = await names.allTextContents();
  expect(shared).toEqual(deck.slice(0, 3));

  const where = b.getByTestId("result").last().getByRole("link", { name: /Where to watch/ });
  await where.scrollIntoViewIfNeeded();
  const scrolled = await b.evaluate(() => window.scrollY);
  await where.click();
  await expect(b).toHaveURL(/\/(title|collection)\//);
  await b.goBack();
  await expect(names).toHaveCount(3);
  expect(await names.allTextContents()).toEqual(shared);
  await expect.poll(() => b.evaluate(() => window.scrollY)).toBeGreaterThan(scrolled - 40);

  const again = await b.context().newPage();
  const url = b.url();
  await b.close();
  await again.goto(url);
  await expect(again.getByTestId("result").locator("p.display")).toHaveCount(3);
  expect(await again.getByTestId("result").locator("p.display").allTextContents()).toEqual(shared);
});
