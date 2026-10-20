import { expect, test } from "@playwright/test";
import { counter, finalSwipe, person, setUpNight, sitDown, swipeRun } from "./helpers";

// Local by default (in-memory store). E2E_LIVE=1 also runs it against a deployed Redis store.
test.skip(Boolean(process.env.E2E_BASE_URL) && !process.env.E2E_LIVE, "live rooms run locally unless E2E_LIVE=1");

test("(f) live: one member at 3 yeses deals five more for both; results only when both are through", async ({ browser }) => {
  const a = await person(browser);
  await setUpNight(a, "Ayşe", "Live room");
  const code = (await a.getByTestId("room-code").textContent())?.trim() ?? "";
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  const b = await person(browser);
  await b.goto(`/match/${code}`);
  await sitDown(b, "Burak");
  for (const p of [a, b]) {
    await expect(p.getByTestId("members")).toContainText("Ayşe");
    await expect(p.getByTestId("members")).toContainText("Burak");
    await p.getByRole("button", { name: /Start swiping/ }).click();
    await expect(counter(p)).toHaveText(/Liked 0 \/ 5 · card 1 of 15/i);
  }

  // Ayşe is at 3 of 5, Burak at 5. Nobody stops early in a room.
  const deckA = await swipeRun(a, "LLL" + "N".repeat(11));
  deckA.push(await finalSwipe(a, "ArrowLeft"));
  await expect(a.getByText("Waiting for Burak.")).toBeVisible();
  const deckB = await swipeRun(b, "LLLLL" + "N".repeat(9));
  deckB.push(await finalSwipe(b, "ArrowLeft"));
  expect(deckB).toEqual(deckA); // one shared deck

  for (const p of [a, b]) {
    await expect(counter(p)).toHaveText(/card 16 of 20/i);
    await expect(p.getByTestId("round-banner")).toHaveText("Five more for everyone.");
  }
  await swipeRun(a, "LLNN");
  await finalSwipe(a, "ArrowLeft"); // 5 yeses now
  await expect(a.getByText("Waiting for Burak.")).toBeVisible();
  await expect(a.getByTestId("results")).toHaveCount(0);
  await swipeRun(b, "LLNN");
  await finalSwipe(b, "ArrowLeft");

  for (const p of [a, b]) {
    await expect(p.getByRole("heading", { name: "You both said yes to these." })).toBeVisible();
    await expect(p.getByTestId("result")).toHaveCount(5); // cards 1-3, then 16 and 17
  }
  await expect(a.getByTestId("result").first()).toContainText(deckA[0]!);
});
