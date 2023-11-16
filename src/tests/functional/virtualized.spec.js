import { test, expect } from "@playwright/test";

test("loads row from backend", async ({ page }) => {
  await page.goto("http://localhost:9000/items");

  await expect(page).toHaveTitle(/Items/);
  await expect(page.locator("li").first().locator("span")).toHaveText("ID 1");
});

test("removes row", async ({ page }) => {
  await page.goto("http://localhost:9000/items");

  await expect(page.locator("li").first().locator("span")).toHaveText("ID 1");
  await page.locator("li").first().locator("button").click();
  await expect(page.locator("li").first().locator("span")).toHaveText("ID 2");
});

test("adds row via action", async ({ page }) => {
  await page.goto("http://localhost:9000/items");
});
