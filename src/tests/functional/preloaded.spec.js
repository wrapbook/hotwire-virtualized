import { test, expect } from "@playwright/test";

test("uses preloaded targets", async ({ page }) => {
  await page.goto("http://localhost:9000/preloaded");

  await expect(page).toHaveTitle(/Preloaded/);
  await expect(page.getByText("Preloaded 1")).toBeVisible();
  await expect(page.getByText("Preloaded 2")).toBeVisible();
  await expect(page.getByText("ID 3")).toBeVisible();
});
