/**
 * End-to-end tests for the local (unauthenticated) user flow.
 *
 * These tests verify that the app works fully without an account by relying on
 * localStorage-backed persistence. Each test clears localStorage before running
 * to ensure a clean starting state.
 */

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Navigate first so we have a window context to clear localStorage.
  await page.goto("/dashboard");
  await page.evaluate(() => {
    localStorage.removeItem("orbits:profiles");
    localStorage.removeItem("orbits:facts");
    localStorage.removeItem("orbits:events");
    localStorage.removeItem("orbits:palette");
  });
  await page.reload();
});

test("/ redirects to /dashboard without requiring login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("dashboard renders add-person form for unauthenticated users", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Add a person")).toBeVisible();
});

test("create a profile and see it in the list", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByPlaceholder("Full name").fill("Jane Doe");
  await page.getByRole("button", { name: "Add person" }).click();

  await expect(page.getByText("Jane Doe")).toBeVisible();
});

test("profile persists after page reload", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByPlaceholder("Full name").fill("Bob Smith");
  await page.getByRole("button", { name: "Add person" }).click();
  await expect(page.getByText("Bob Smith")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Bob Smith")).toBeVisible();
});

test("add a fact to a profile and see it persist after reload", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByPlaceholder("Full name").fill("Alice");
  await page.getByRole("button", { name: "Add person" }).click();
  await page.getByText("Alice").click();
  await page.waitForURL(/\/profile\//);

  // Switch to Add tab to access the note input form.
  await page.getByRole("button", { name: /Add/ }).click();
  await page.getByPlaceholder("Add a note...").fill("Loves hiking");
  // .nth(1): [0]=Add tab toggle, [1]=AddFactForm submit, [2]=AddEventForm submit
  await page.getByRole("button", { name: "Add" }).nth(1).click();

  // Switch to Notes tab to verify the fact appeared.
  await page.getByRole("button", { name: /Notes/ }).click();
  await expect(page.getByText("Loves hiking")).toBeVisible();

  await page.reload();
  // After reload the profile page defaults to the Notes tab — fact is visible immediately.
  await expect(page.getByText("Loves hiking")).toBeVisible();
});

test("delete a fact and confirm it is gone after reload", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByPlaceholder("Full name").fill("Charlie");
  await page.getByRole("button", { name: "Add person" }).click();
  await page.getByText("Charlie").click();
  await page.waitForURL(/\/profile\//);

  // Add the note via the Add tab.
  await page.getByRole("button", { name: /Add/ }).click();
  await page.getByPlaceholder("Add a note...").fill("Temporary note");
  // .nth(1): [0]=Add tab toggle, [1]=AddFactForm submit, [2]=AddEventForm submit
  await page.getByRole("button", { name: "Add" }).nth(1).click();

  // Switch to Notes tab to verify and delete.
  await page.getByRole("button", { name: /Notes/ }).click();
  await expect(page.getByText("Temporary note")).toBeVisible();

  await page.getByRole("button", { name: "Delete note" }).click();
  await expect(page.getByText("Temporary note")).not.toBeVisible();

  await page.reload();
  // After reload defaults to Notes tab — note should still be gone.
  await expect(page.getByText("Temporary note")).not.toBeVisible();
});

test("add an event to a profile and see it persist after reload", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByPlaceholder("Full name").fill("Diana");
  await page.getByRole("button", { name: "Add person" }).click();
  await page.getByText("Diana").click();
  await page.waitForURL(/\/profile\//);

  // Switch to Add tab to access the event input form.
  await page.getByRole("button", { name: /Add/ }).click();
  await page.getByPlaceholder("Event title").fill("Coffee catch-up");
  // Open the DateTimePicker, pick the first calendar day, then confirm.
  await page.getByRole("button", { name: "Date & time" }).click();
  await page.locator('button[aria-label*="2026"]').first().click();
  await page.getByRole("button", { name: "Done" }).click();
  // .nth(2): [0]=Add tab toggle, [1]=AddFactForm submit, [2]=AddEventForm submit
  await page.getByRole("button", { name: "Add" }).nth(2).click();

  // Switch to Notes tab to verify the event appeared.
  await page.getByRole("button", { name: /Notes/ }).click();
  await expect(page.getByText("Coffee catch-up")).toBeVisible();

  await page.reload();
  // After reload defaults to Notes tab — events are visible immediately.
  await expect(page.getByText("Coffee catch-up")).toBeVisible();
});

test("delete a profile and redirect to dashboard", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByPlaceholder("Full name").fill("TempPerson");
  await page.getByRole("button", { name: "Add person" }).click();
  await page.getByText("TempPerson").click();
  await page.waitForURL(/\/profile\//);

  // Confirm the delete dialog.
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Delete/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("TempPerson")).not.toBeVisible();
});

test("avatar dropdown shows 'Create account' link for local users", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByText("Create account")).toBeVisible();
});

test("/login redirects to /account", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/account/);
});
