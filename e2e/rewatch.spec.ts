import { expect, test, type Page } from "@playwright/test";
import { counter, finalSwipe, person, setUpNight, sitDown, swipeRun } from "./helpers";

// v2.7: ↑ is "seen it, and I'd watch it again". It counts as a yes, the title can be shared,
// and the results say who has seen it. Phone width; live rooms run locally unless E2E_LIVE=1.
const PHONE = { width: 375, height: 812 };
const live = !process.env.E2E_BASE_URL || Boolean(process.env.E2E_LIVE);

const seenBy = (p: Page, i: number) => p.getByTestId("result").nth(i).getByTestId("seen-by");

test("live: Aslı swipes up on card 1, yes on card 2; Mali yes on both: both shared, card 1 says Aslı has seen it", async ({ browser }) => {
  test.skip(!live, "live rooms run locally unless E2E_LIVE=1");
  const a = await person(browser, PHONE);
  await setUpNight(a, "Aslı", "Live room");
  const code = (await a.getByTestId("room-code").textContent())?.trim() ?? "";
  const b = await person(browser, PHONE);
  await b.goto(`/match/${code}`);
  await sitDown(b, "Mali");
  for (const p of [a, b]) {
    await expect(p.getByTestId("members")).toContainText("Mali");
    await p.getByRole("button", { name: /Start swiping/ }).click();
  }
  // Five yeses each so the room ends at 15; only cards 1 and 2 are yeses from both.
  const deck = await swipeRun(a, "RLLLL" + "N".repeat(9));
  deck.push(await finalSwipe(a, "ArrowLeft"));
  await expect(counter(a)).toHaveCount(0); // through, waiting for Mali
  await swipeRun(b, "LLNNNLLL" + "N".repeat(6));
  await finalSwipe(b, "ArrowLeft");

  for (const p of [a, b]) {
    await expect(p.getByRole("heading", { name: "You both said yes to these." })).toBeVisible();
    await expect(p.getByTestId("result")).toHaveCount(2);
    await expect(p.getByTestId("result").nth(0)).toContainText(deck[0]!);
    await expect(p.getByTestId("result").nth(1)).toContainText(deck[1]!);
    await expect(seenBy(p, 1)).toHaveCount(0);
  }
  await expect(seenBy(b, 0)).toHaveText("Aslı has seen it");
  await expect(seenBy(a, 0)).toHaveText("You've seen it");
});

test("link: the same night by link: the rewatch travels in the URL and the friend sees who has seen it", async ({ browser }) => {
  const a = await person(browser, PHONE);
  await setUpNight(a, "Aslı", "Pass a link");
  const deck = [...(await swipeRun(a, "RLLL")), await finalSwipe(a, "ArrowRight")]; // five yeses, one a rewatch
  await expect(a.getByTestId("share-screen")).toContainText("You said yes to 5.");
  const link = await a.getByTestId("share-url").inputValue();

  const b = await person(browser, PHONE);
  await b.goto(link);
  await sitDown(b, "Mali");
  await expect(counter(b)).toHaveText(/card 1 of 5/i);
  await swipeRun(b, "LLNN");
  await finalSwipe(b, "ArrowLeft");
  await expect(b.getByRole("heading", { name: "You both said yes to these." })).toBeVisible();
  await expect(b.getByTestId("result")).toHaveCount(2);
  await expect(b.getByTestId("result").nth(0)).toContainText(deck[0]!);
  await expect(seenBy(b, 0)).toHaveText("Aslı has seen it");
  await expect(seenBy(b, 1)).toHaveCount(0);

  // The results link going back to Aslı says it to her too.
  const back = await b.getByTestId("send-back").getAttribute("data-url");
  await a.goto(back!);
  await expect(seenBy(a, 0)).toHaveText("You've seen it");
});

test("keyboard ↑ and the ↑ Rewatch button send a rewatch: it counts toward the five, and the button fits at 375", async ({ browser }) => {
  const a = await person(browser, PHONE);
  await setUpNight(a, "Aslı", "Pass a link");
  await expect(counter(a)).toHaveText(/Liked 0 \/ 5 · card 1 of 15/i);
  await swipeRun(a, "R");
  await expect(counter(a)).toHaveText(/Liked 1 \/ 5 · card 2 of 15/i);
  const up = a.getByRole("button", { name: /↑ Rewatch/ });
  await expect(up).toBeVisible();
  const box = await up.boundingBox();
  expect(box && box.x + box.width).toBeLessThanOrEqual(PHONE.width); // fits the row at 375
  await up.click();
  await expect(counter(a)).toHaveText(/Liked 2 \/ 5 · card 3 of 15/i);
});
