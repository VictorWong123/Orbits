/**
 * End-to-end tests for the swipe-to-delete interaction.
 *
 * These tests verify the complete gesture flow:
 *   1. A swipe past the threshold reveals the delete zone and opens a
 *      ConfirmDialog.
 *   2. Confirming removes the item from the UI.
 *   3. Cancelling from the dialog closes it without deleting.
 *   4. A short swipe (below threshold) snaps the card back without triggering
 *      the confirmation dialog.
 *
 * Tests run against the local (unauthenticated) DataStore so no Supabase
 * credentials are required.  Each test seeds localStorage directly via
 * page.evaluate() and reloads to get a clean, deterministic starting state.
 */

import { test, expect, type Page } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Seeds a single profile into localStorage so the dashboard shows one
 * SwipeToDelete-wrapped card without navigating through the add-person form.
 */
async function seedProfile(page: Page, name: string) {
  await page.evaluate((profileName) => {
    const profile = {
      id: "test-profile-swipe-001",
      user_id: "local",
      full_name: profileName,
      birthday: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem("orbits:profiles", JSON.stringify([profile]));
    localStorage.setItem("orbits:facts", JSON.stringify([]));
    localStorage.setItem("orbits:events", JSON.stringify([]));
  }, name);
}

/**
 * Seeds a fact into localStorage for the given profileId.
 */
async function seedFact(page: Page, profileId: string, content: string) {
  await page.evaluate(
    ({ id, pId, text }) => {
      const fact = {
        id,
        user_id: "local",
        profile_id: pId,
        content: text,
        category: "general",
        created_at: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("orbits:facts") ?? "[]");
      localStorage.setItem("orbits:facts", JSON.stringify([...existing, fact]));
    },
    { id: "test-fact-swipe-001", pId: profileId, text: content }
  );
}

/**
 * Performs a left-swipe gesture on the given element using the Playwright
 * mouse API. The drag travels `distancePx` pixels to the left in small steps
 * to fire intermediate pointermove events (required by SwipeToDelete logic).
 *
 * @param page - The Playwright Page object.
 * @param selector - CSS / test-id selector for the swipeable element.
 * @param distancePx - How many pixels to swipe left (positive number).
 */
async function swipeLeft(
  page: Page,
  selector: string,
  distancePx: number
): Promise<void> {
  const el = page.locator(selector).first();
  const box = await el.boundingBox();
  if (!box) throw new Error(`Element not found or has no bounding box: ${selector}`);

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Move in 10-pixel increments to generate intermediate pointermove events.
  const steps = Math.ceil(distancePx / 10);
  await page.mouse.move(startX - distancePx, startY, { steps });
  await page.mouse.up();
}

// ── Profile card swipe tests (dashboard) ──────────────────────────────────────

test.describe("Profile card swipe-to-delete", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.evaluate(() => {
      localStorage.removeItem("orbits:profiles");
      localStorage.removeItem("orbits:facts");
      localStorage.removeItem("orbits:events");
    });
    await seedProfile(page, "Swipe Test Person");
    await page.reload();
    await expect(page.getByText("Swipe Test Person")).toBeVisible();
  });

  test("full swipe opens the confirm dialog", async ({ page }) => {
    await swipeLeft(page, '[data-testid="swipe-item"]', 70);

    await expect(
      page.getByRole("alertdialog").getByText("Delete person?")
    ).toBeVisible();

    await page.screenshot({ path: "screenshots/swipe-profile-confirm-open.png" });
  });

  test("confirming deletion removes the profile card", async ({ page }) => {
    await swipeLeft(page, '[data-testid="swipe-item"]', 70);

    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Swipe Test Person")).not.toBeVisible();
    await page.screenshot({ path: "screenshots/swipe-profile-deleted.png" });
  });

  test("cancelling the dialog keeps the profile card visible", async ({ page }) => {
    await swipeLeft(page, '[data-testid="swipe-item"]', 70);

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText("Swipe Test Person")).toBeVisible();
    await page.screenshot({ path: "screenshots/swipe-profile-cancel.png" });
  });

  test("short swipe (below threshold) does not open the confirm dialog", async ({
    page,
  }) => {
    // Swipe only 20px — well below the 65px SNAP_THRESHOLD.
    await swipeLeft(page, '[data-testid="swipe-item"]', 20);

    await expect(page.getByRole("alertdialog")).not.toBeVisible();
    await expect(page.getByText("Swipe Test Person")).toBeVisible();
    await page.screenshot({ path: "screenshots/swipe-profile-short-snap-back.png" });
  });

  test("tapping the card (no swipe) navigates to the profile page", async ({
    page,
  }) => {
    // A zero-distance tap should navigate, not open the confirm dialog.
    await page.getByText("Swipe Test Person").click();
    await page.waitForURL(/\/profile\//);
    await expect(page).toHaveURL(/\/profile\//);
  });
});

// ── Note (fact) swipe tests (profile detail page) ─────────────────────────────

test.describe("Note swipe-to-delete on profile page", () => {
  test.beforeEach(async ({ page }) => {
    const PROFILE_ID = "test-profile-swipe-001";
    await page.goto("/dashboard");
    await page.evaluate(() => {
      localStorage.removeItem("orbits:profiles");
      localStorage.removeItem("orbits:facts");
      localStorage.removeItem("orbits:events");
    });
    await seedProfile(page, "Note Swipe Person");
    await seedFact(page, PROFILE_ID, "Swipe me to delete");
    await page.reload();

    // Navigate to the profile page.
    await page.getByText("Note Swipe Person").click();
    await page.waitForURL(/\/profile\//);

    // Ensure the Notes tab is active and the fact is visible.
    await page.getByRole("button", { name: /Notes/ }).click();
    await expect(page.getByText("Swipe me to delete")).toBeVisible();
  });

  test("full swipe on a note opens the confirm dialog", async ({ page }) => {
    await swipeLeft(page, '[data-testid="swipe-item"]', 70);

    await expect(
      page.getByRole("alertdialog").getByText("Delete note?")
    ).toBeVisible();

    await page.screenshot({ path: "screenshots/swipe-note-confirm-open.png" });
  });

  test("confirming deletion removes the note", async ({ page }) => {
    await swipeLeft(page, '[data-testid="swipe-item"]', 70);
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Swipe me to delete")).not.toBeVisible();
    await page.screenshot({ path: "screenshots/swipe-note-deleted.png" });
  });

  test("cancelling keeps the note visible", async ({ page }) => {
    await swipeLeft(page, '[data-testid="swipe-item"]', 70);
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText("Swipe me to delete")).toBeVisible();
    await page.screenshot({ path: "screenshots/swipe-note-cancel.png" });
  });
});
