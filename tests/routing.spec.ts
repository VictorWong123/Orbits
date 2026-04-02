/**
 * Routing and navigation edge-case tests.
 *
 * Verifies that redirects, the /account page behaviour, and URL guard rails
 * work correctly for both local and authenticated users.
 */

import { test, expect } from "@playwright/test";

test("/ redirects to /dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("/login permanently redirects to /account", async ({ page }) => {
  const response = await page.goto("/login");
  // The middleware issues a 301 for /login, so the browser follows to /account.
  await expect(page).toHaveURL(/\/account/);
  // Verify the response chain included a redirect.
  expect(response?.status()).toBeLessThan(400);
});

test("/account shows sign-in form for unauthenticated users", async ({ page }) => {
  // Make sure we are not authenticated.
  await page.goto("/dashboard");
  await page.evaluate(() => localStorage.clear());

  await page.goto("/account");
  // Two "Sign In" elements exist: the tab toggle and the submit button — use first().
  await expect(page.getByRole("button", { name: "Sign In" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign Up" }).first()).toBeVisible();
});

test("dashboard is accessible without a login", async ({ page }) => {
  await page.goto("/dashboard");
  // Should NOT be redirected to /login or /account.
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Orbit")).toBeVisible();
});

test("navigating to an unknown profile id redirects to dashboard", async ({ page }) => {
  await page.goto("/profile/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
});
