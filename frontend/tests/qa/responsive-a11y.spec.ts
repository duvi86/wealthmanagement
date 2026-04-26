import { expect, test } from "@playwright/test";

test.describe("Phase 7 responsive + accessibility smoke", () => {
  test("skip link is keyboard reachable", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  });

  test("mobile navigation toggle updates aria-expanded", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: /open navigation|close navigation/i });
    await expect(menuButton).toBeVisible();

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  test("desktop/tablet/mobile render without horizontal overflow", async ({ page }) => {
    const sizes = [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 375, height: 812 },
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.goto("/components");
      await expect(page.locator("main")).toBeVisible();

      const hasOverflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });
      expect(hasOverflow).toBe(false);
    }
  });
});
