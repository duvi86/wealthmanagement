# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive-a11y.spec.ts >> Phase 7 responsive + accessibility smoke >> skip link is keyboard reachable
- Location: tests/qa/responsive-a11y.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator: getByRole('link', { name: 'Skip to main content' })
Expected: focused
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByRole('link', { name: 'Skip to main content' })

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - heading "404" [level=1] [ref=e5]
  - heading "This page could not be found." [level=2] [ref=e7]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test.describe("Phase 7 responsive + accessibility smoke", () => {
  4  |   test("skip link is keyboard reachable", async ({ page }) => {
  5  |     await page.goto("/");
  6  |     await page.keyboard.press("Tab");
> 7  |     await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
     |                                                                            ^ Error: expect(locator).toBeFocused() failed
  8  |   });
  9  | 
  10 |   test("mobile navigation toggle updates aria-expanded", async ({ page }) => {
  11 |     await page.setViewportSize({ width: 375, height: 812 });
  12 |     await page.goto("/");
  13 |     const menuButton = page.getByRole("button", { name: /open navigation|close navigation/i });
  14 |     await expect(menuButton).toBeVisible();
  15 | 
  16 |     await menuButton.click();
  17 |     await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  18 | 
  19 |     await menuButton.click();
  20 |     await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  21 |   });
  22 | 
  23 |   test("desktop/tablet/mobile render without horizontal overflow", async ({ page }) => {
  24 |     const sizes = [
  25 |       { width: 1440, height: 900 },
  26 |       { width: 768, height: 1024 },
  27 |       { width: 375, height: 812 },
  28 |     ];
  29 | 
  30 |     for (const size of sizes) {
  31 |       await page.setViewportSize(size);
  32 |       await page.goto("/");
  33 |       await expect(page.locator("#main-content")).toBeVisible();
  34 | 
  35 |       const overflowPixels = await page.evaluate(() => {
  36 |         const main = document.getElementById("main-content");
  37 |         if (!main) return 0;
  38 |         return Math.max(0, main.scrollWidth - main.clientWidth);
  39 |       });
  40 |       // Allow a small tolerance for browser rendering variance.
  41 |       expect(overflowPixels).toBeLessThanOrEqual(16);
  42 |     }
  43 |   });
  44 | });
  45 | 
```