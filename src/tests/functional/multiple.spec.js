import { test, expect } from "@playwright/test";

test("loads into multiple virtualized instances", async ({ page }) => {
  await page.goto("http://localhost:9000/multiple");

  await expect(page).toHaveTitle(/Multiple/);
  await expect(page.getByText("ID 1 virtual-a")).toBeVisible();
  await expect(page.getByText("ID 2 virtual-a")).toBeVisible();
  await expect(page.getByText("ID 1 virtual-b")).toBeVisible();
  await expect(page.getByText("ID 2 virtual-b")).toBeVisible();
});
