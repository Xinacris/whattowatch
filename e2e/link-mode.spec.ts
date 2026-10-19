import { expect, test } from "@playwright/test";
import { person, setUpNight, sitDown, swipe, topCard } from "./helpers";

test("link mode: A swipes and shares, B swipes the same deck, both land on the same match", async ({ browser }) => {
  const a = await person(browser);
  await setUpNight(a, "Ayşe", "Pass a link");
  const liked = await swipe(a, "ArrowRight");
  await swipe(a, "ArrowLeft");
  await swipe(a, "ArrowRight");
  await a.getByTestId("share").click();
  const link = a.url();
  expect(link).toContain("/match/link?d=");

  const b = await person(browser);
  await b.goto(link);
  await expect(b.getByRole("heading", { name: /Ayşe already swiped/ })).toBeVisible();
  await sitDown(b, "Burak");
  expect(await topCard(b)).toBe(liked); // same seed, same deck
  await swipe(b, "ArrowRight");
  const dialog = b.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Tonight, it's this." })).toBeVisible();
  await expect(dialog).toContainText(liked);

  // B sends it back; A sees the same title on the shortlist.
  await dialog.getByRole("button", { name: "Keep swiping" }).click();
  await b.getByTestId("share").click();
  await a.goto(b.url());
  await a.getByRole("button", { name: /1 matched/ }).click();
  await expect(a.getByRole("heading", { name: "The shortlist" })).toBeVisible();
  await expect(a.getByRole("listitem").first()).toContainText(liked);
});
