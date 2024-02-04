import { test, expect } from "@playwright/test";

test("loads row from backend", async ({ page }) => {
  await page.goto("http://localhost:9000/items");

  await expect(page).toHaveTitle(/Items/);
  await expect(page.locator("li").first().locator("span")).toHaveText("ID 1");
});

test("removes row", async ({ page }) => {
  await page.goto("http://localhost:9000/items");

  await expect(page.locator("li").first().locator("span")).toHaveText("ID 1");
  await page
    .locator("li")
    .first()
    .locator("button", { hasText: "Delete" })
    .click();
  await expect(page.locator("li").first().locator("span")).toHaveText("ID 2");
});

test("updates row", async ({ page }) => {
  await page.goto("http://localhost:9000/items");

  await expect(page.locator("li").first().locator("span")).toHaveText("ID 1");
  await page
    .locator("li")
    .first()
    .locator("button", { hasText: "Update" })
    .click();
  await expect(page.locator("li").first().locator("span")).toContainText(
    "updated"
  );
});

test("prepends row via action", async ({ page }) => {
  await page.goto("http://localhost:9000/items");
  await expect(page.locator("li").first().locator("span")).toHaveText("ID 1");

  await page
    .getByTestId("v-actions")
    .locator("button", { hasText: "Prepend ID" })
    .click();

  const id = `ID ${Date.now()}`.substring(0, 10);
  await expect(page.locator("li").first().locator("span")).toContainText(id);
});

test("prepends row via event", async ({ page }) => {
  await page.goto("http://localhost:9000/items");
  await expect(page.locator("li").first().locator("span")).toHaveText("ID 1");

  await page
    .getByTestId("v-actions")
    .locator("button", { hasText: "Prepend Row" })
    .click();

  const id = `ID ${Date.now()}`.substring(0, 10);
  await expect(page.locator("li").first().locator("span")).toContainText(id);
});
