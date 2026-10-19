import { expect, test } from "@playwright/test";
import { counter, finalSwipe, person, setUpNight, sitDown, swipeRun } from "./helpers";

test.skip(Boolean(process.env.E2E_BASE_URL), "live rooms run against the local in-memory store");

test("(f) live: one member under 30% deals five more for both; results only when both are through", async ({ browser }) => {
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
    await expect(counter(p)).toHaveText(/card 1 of 10/i);
  }

  // Ayşe is picky (1 of 10), Burak isn't (5 of 10).
  const deckA = await swipeRun(a, "LNNNNNNNN");
  deckA.push(await finalSwipe(a, "ArrowLeft"));
  await expect(a.getByText("Waiting for Burak.")).toBeVisible();
  const deckB = await swipeRun(b, "LLLLLNNNN");
  deckB.push(await finalSwipe(b, "ArrowLeft"));
  expect(deckB).toEqual(deckA); // one shared deck

  for (const p of [a, b]) {
    await expect(counter(p)).toHaveText(/card 11 of 15/i);
    await expect(p.getByTestId("round-banner")).toBeVisible();
  }
  await swipeRun(a, "LLLL");
  await finalSwipe(a, "ArrowRight"); // 6 of 15 now
  await expect(a.getByText("Waiting for Burak.")).toBeVisible();
  await expect(a.getByTestId("results")).toHaveCount(0);
  await swipeRun(b, "LLNN");
  await finalSwipe(b, "ArrowLeft");

  for (const p of [a, b]) {
    await expect(p.getByRole("heading", { name: "You both said yes to these." })).toBeVisible();
    await expect(p.getByTestId("result")).toHaveCount(3); // card 1, then cards 11 and 12
  }
  await expect(a.getByTestId("result").first()).toContainText(deckA[0]!);
});
