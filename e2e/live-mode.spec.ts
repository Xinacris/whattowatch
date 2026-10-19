import { expect, test } from "@playwright/test";
import { person, setUpNight, sitDown, swipe } from "./helpers";

test.skip(Boolean(process.env.E2E_BASE_URL), "live rooms run against the local in-memory store");

test("live mode: two people in one room both like a title and both see the match", async ({ browser }) => {
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
  }

  const titleA = await swipe(a, "ArrowRight");
  const titleB = await swipe(b, "ArrowRight");
  expect(titleB).toBe(titleA);
  for (const p of [a, b]) {
    const dialog = p.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Tonight, it's this." })).toBeVisible();
    await expect(dialog).toContainText(titleA);
  }
});
