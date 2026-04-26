import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/okr",
  "/dependencies",
  "/capacity",
  "/config",
  "/charts",
  "/temporal",
  "/components",
  "/forms",
  "/tables",
  "/advanced",
  "/exploratory",
  "/notifications",
  "/chatbot",
];

test.describe("Phase 7 route smoke", () => {
  for (const route of routes) {
    test(`renders ${route} with shell`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("header, [role='banner']")).toBeVisible();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1, h2").first()).toBeVisible();
      await expect(page.getByText(/Unhandled Runtime Error|Application error|Hydration failed/i)).toHaveCount(0);
    });
  }
});
