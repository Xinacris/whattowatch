import { expect, test, type Page } from "@playwright/test";
import { person } from "./helpers";

/** The search box (on a phone the header's is folded behind a button, so take the one on screen). */
const searchBox = (p: Page) => p.getByRole("combobox", { name: "Search titles and people" }).filter({ visible: true }).first();

/** The filters, ready to tap: a sidebar on desktop, a sheet behind the "Filters" chip on a phone. */
async function openFilters(p: Page) {
  const chip = p.getByTestId("filters-chip");
  if ((await chip.isVisible()) && (await chip.getAttribute("aria-expanded")) !== "true") await chip.click();
  return p.getByRole("complementary", { name: "Filters" });
}

test("(e) suggestions are keyboard-navigable; Enter without a pick searches", async ({ browser }) => {
  const p = await person(browser);
  await p.goto("/");
  const box = searchBox(p);
  await box.fill("m");
  await p.waitForTimeout(400);
  await expect(p.getByRole("listbox", { name: "Search titles and people" }).first()).toBeHidden(); // one letter: nothing yet
  await box.fill("matrix");
  const options = p.getByRole("listbox").first().getByRole("option");
  await expect(options.first()).toContainText("The Matrix");
  await box.press("ArrowDown");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await expect(box).toHaveAttribute("aria-activedescendant", /opt-0/);
  await box.press("ArrowDown");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await box.press("ArrowUp");
  await box.press("Escape");
  await expect(p.getByRole("listbox").first()).toBeHidden();
  await box.press("Enter");
  await expect(p).toHaveURL(/\/search\?q=matrix/);
  await expect(p.getByTestId("search-result").first()).toContainText("Matrix");
});

test("(e) suggestions open the detail page; Turkish queries work", async ({ browser }) => {
  const p = await person(browser);
  await p.goto("/search");
  const box = searchBox(p);
  await box.fill("eşkıya");
  await expect(p.getByRole("listbox", { name: "Search titles and people" }).first().getByRole("option").first()).toBeVisible();
  await box.press("ArrowDown");
  await box.press("Enter");
  await expect(p).toHaveURL(/\/(title|person)\/\w+\/?\d*/);
});

test("(e) filters live in the URL: reload and back keep them; only-my-services narrows results", async ({ browser }) => {
  const p = await person(browser);
  await p.goto("/search");
  await expect(p.getByTestId("search-result").first()).toBeVisible();
  await (await openFilters(p)).getByRole("button", { name: "Comedy" }).click();
  await expect(p).toHaveURL(/g=comedy/);
  await (await openFilters(p)).getByRole("button", { name: "Movie", exact: true }).click();
  await expect(p).toHaveURL(/type=movie.*g=comedy|g=comedy.*type=movie/);
  await p.reload();
  await expect((await openFilters(p)).getByRole("button", { name: "Comedy" })).toHaveAttribute("aria-pressed", "true");
  await p.goBack();
  await expect(p).toHaveURL(/g=comedy/);
  await expect(p).not.toHaveURL(/type=movie/);
  await expect((await openFilters(p)).getByRole("button", { name: "Comedy" })).toHaveAttribute("aria-pressed", "true");

  // Only my services: pick one service, every result's logos include it.
  // The panel remounts when the back navigation's render lands; "Movie" unpressed means it has.
  // (On a phone that remount also closes the sheet, so open it again until it holds.)
  await expect(async () => {
    await expect((await openFilters(p)).getByRole("button", { name: "Movie", exact: true })).toHaveAttribute("aria-pressed", "false", { timeout: 1000 });
  }).toPass();
  const before = await p.getByTestId("search-result").allInnerTexts();
  await (await openFilters(p)).getByTestId("only-mine").click();
  const service = (await openFilters(p)).getByRole("button", { name: /Netflix/ });
  await service.click();
  await expect(p).toHaveURL(/on=8/);
  await expect(p.getByTestId("search-result").first()).toBeVisible();
  const after = await p.getByTestId("search-result").allInnerTexts();
  expect(after).not.toEqual(before);
  await expect(p.getByTestId("search-result").first().getByRole("img", { name: "Netflix" })).toBeVisible();

  // Remembered in the prefs cookie for next time.
  const cookies = await p.context().cookies();
  expect(cookies.find((c) => c.name === "wtw_services")?.value).toBe("8");
});

test("(e) contradicting years get swapped; spaces-only is browse mode; empty results offer a way out", async ({ browser }) => {
  const p = await person(browser);
  await p.goto("/search?from=2010&to=1990");
  await expect(p.getByLabel("From")).toHaveValue("1990");
  await expect(p.getByLabel("To")).toHaveValue("2010");
  await p.goto("/search?q=%20%20%20");
  await expect(p.getByRole("heading", { name: "Browsing the shelves" })).toBeVisible();
  await p.goto("/search?q=zzqxv%20nothing%20here&r=9.5&from=1950&to=1951");
  await expect(p.getByTestId("search-empty")).toBeVisible();
  await p.getByRole("link", { name: "Drop the rating" }).click();
  await expect(p).not.toHaveURL(/r=9.5/);
});
