import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("http://localhost:9000/items");

  await expect(page).toHaveTitle(/Items/);
  await expect(page.locator("li").first()).toHaveText("ID 1");
});
