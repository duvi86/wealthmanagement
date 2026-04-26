# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: route-smoke.spec.ts >> Phase 7 route smoke >> renders /forms with shell
- Location: tests/qa/route-smoke.spec.ts:22:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('header, [role=\'banner\']')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('header, [role=\'banner\']')

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
  3  | const routes = [
  4  |   "/",
  5  |   "/okr",
  6  |   "/dependencies",
  7  |   "/capacity",
  8  |   "/config",
  9  |   "/charts",
  10 |   "/temporal",
  11 |   "/components",
  12 |   "/forms",
  13 |   "/tables",
  14 |   "/advanced",
  15 |   "/exploratory",
  16 |   "/notifications",
  17 |   "/chatbot",
  18 | ];
  19 | 
  20 | test.describe("Phase 7 route smoke", () => {
  21 |   for (const route of routes) {
  22 |     test(`renders ${route} with shell`, async ({ page }) => {
  23 |       await page.goto(route);
> 24 |       await expect(page.locator("header, [role='banner']")).toBeVisible();
     |                                                             ^ Error: expect(locator).toBeVisible() failed
  25 |       await expect(page.locator("#main-content")).toBeVisible();
  26 |       await expect(page.locator("h1, h2").first()).toBeVisible();
  27 |       await expect(page.getByText(/Unhandled Runtime Error|Application error|Hydration failed/i)).toHaveCount(0);
  28 |     });
  29 |   }
  30 | });
  31 | 
```