import { expect, test } from "@playwright/test";

test("loads login and shows wallet login heading", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Wallet Login" })).toBeVisible();
});

test("brand dashboard route is reachable", async ({ page }) => {
  await page.goto("/brand/dashboard");
  await expect(page.getByRole("heading", { name: "Brand Dashboard" })).toBeVisible();
});
