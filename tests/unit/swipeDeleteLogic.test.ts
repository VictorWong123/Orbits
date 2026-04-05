import { describe, it, expect } from "vitest";
import {
  DELETE_ZONE_WIDTH,
  SHOW_ZONE_THRESHOLD,
  SNAP_THRESHOLD,
  MOVE_THRESHOLD,
  WHEEL_SNAP_DELAY,
  clampOffset,
  iconOpacity,
  shouldTriggerDelete,
  isSwipeGesture,
} from "@frontend/lib/swipeDeleteLogic";

// ── Constants ─────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("DELETE_ZONE_WIDTH is a positive number", () => {
    expect(DELETE_ZONE_WIDTH).toBeGreaterThan(0);
  });

  it("SHOW_ZONE_THRESHOLD is 50% of DELETE_ZONE_WIDTH", () => {
    expect(SHOW_ZONE_THRESHOLD).toBe(DELETE_ZONE_WIDTH * 0.5);
  });

  it("SNAP_THRESHOLD equals SHOW_ZONE_THRESHOLD (both at 50%)", () => {
    expect(SNAP_THRESHOLD).toBe(SHOW_ZONE_THRESHOLD);
    expect(SNAP_THRESHOLD).toBeLessThan(DELETE_ZONE_WIDTH);
  });

  it("MOVE_THRESHOLD is a small positive number (tap classification)", () => {
    expect(MOVE_THRESHOLD).toBeGreaterThan(0);
    expect(MOVE_THRESHOLD).toBeLessThan(20);
  });

  it("WHEEL_SNAP_DELAY is a positive number of milliseconds", () => {
    expect(WHEEL_SNAP_DELAY).toBeGreaterThan(0);
  });
});

// ── clampOffset ───────────────────────────────────────────────────────────────

describe("clampOffset", () => {
  it("returns 0 for zero delta from resting position", () => {
    expect(clampOffset(0, 0)).toBe(0);
  });

  it("clamps left swipe to −DELETE_ZONE_WIDTH at maximum", () => {
    expect(clampOffset(0, -DELETE_ZONE_WIDTH)).toBe(-DELETE_ZONE_WIDTH);
    expect(clampOffset(0, -DELETE_ZONE_WIDTH * 2)).toBe(-DELETE_ZONE_WIDTH);
    expect(clampOffset(0, -999)).toBe(-DELETE_ZONE_WIDTH);
  });

  it("clamps right swipe to 0 (no rightward movement allowed)", () => {
    expect(clampOffset(0, 10)).toBe(0);
    expect(clampOffset(0, 100)).toBe(0);
  });

  it("tracks within the allowed range", () => {
    const half = -DELETE_ZONE_WIDTH / 2;
    expect(clampOffset(0, half)).toBe(half);
  });

  it("respects a non-zero startOffset correctly", () => {
    // If startOffset is −20 and delta is −30, result is −50 (not exceeding DELETE_ZONE_WIDTH)
    const result = clampOffset(-20, -30);
    expect(result).toBe(-50);
    expect(result).toBeGreaterThanOrEqual(-DELETE_ZONE_WIDTH);
  });

  it("does not allow exceeding left boundary with a non-zero startOffset", () => {
    expect(clampOffset(-DELETE_ZONE_WIDTH, -50)).toBe(-DELETE_ZONE_WIDTH);
  });
});

// ── iconOpacity ───────────────────────────────────────────────────────────────

describe("iconOpacity", () => {
  it("returns 0 when the card is at rest (offset = 0)", () => {
    expect(iconOpacity(0)).toBe(0);
  });

  it("returns 0 for any swipe shallower than SHOW_ZONE_THRESHOLD", () => {
    // Zone stays hidden until the user has committed to the gesture
    expect(iconOpacity(-1)).toBe(0);
    expect(iconOpacity(-SHOW_ZONE_THRESHOLD + 1)).toBe(0);
    expect(iconOpacity(-SHOW_ZONE_THRESHOLD)).toBe(0);
  });

  it("returns 0 at exactly SHOW_ZONE_THRESHOLD (threshold is exclusive on ramp start)", () => {
    expect(iconOpacity(-SHOW_ZONE_THRESHOLD)).toBe(0);
  });

  it("returns 1 when fully swiped to DELETE_ZONE_WIDTH", () => {
    expect(iconOpacity(-DELETE_ZONE_WIDTH)).toBe(1);
  });

  it("returns 0.5 at the midpoint of the visible ramp (between threshold and full open)", () => {
    // Midpoint of ramp: SHOW_ZONE_THRESHOLD + (DELETE_ZONE_WIDTH - SHOW_ZONE_THRESHOLD) / 2
    const midRamp = -(SHOW_ZONE_THRESHOLD + (DELETE_ZONE_WIDTH - SHOW_ZONE_THRESHOLD) / 2);
    expect(iconOpacity(midRamp)).toBeCloseTo(0.5);
  });

  it("clamps at 1 even for offsets larger than DELETE_ZONE_WIDTH", () => {
    expect(iconOpacity(-DELETE_ZONE_WIDTH * 2)).toBe(1);
    expect(iconOpacity(-999)).toBe(1);
  });

  it("always returns a value in [0, 1]", () => {
    [-0, -10, -40, -80, -200].forEach((offset) => {
      const opacity = iconOpacity(offset);
      expect(opacity).toBeGreaterThanOrEqual(0);
      expect(opacity).toBeLessThanOrEqual(1);
    });
  });

  it("increases monotonically as offset becomes more negative", () => {
    const opacities = [0, -10, -20, -40, -60, -80].map(iconOpacity);
    for (let i = 1; i < opacities.length; i++) {
      expect(opacities[i]).toBeGreaterThanOrEqual(opacities[i - 1]);
    }
  });
});

// ── shouldTriggerDelete ───────────────────────────────────────────────────────

describe("shouldTriggerDelete", () => {
  it("returns true when exactly at −SNAP_THRESHOLD", () => {
    expect(shouldTriggerDelete(-SNAP_THRESHOLD)).toBe(true);
  });

  it("returns true when past the threshold (more negative)", () => {
    expect(shouldTriggerDelete(-SNAP_THRESHOLD - 1)).toBe(true);
    expect(shouldTriggerDelete(-DELETE_ZONE_WIDTH)).toBe(true);
    expect(shouldTriggerDelete(-999)).toBe(true);
  });

  it("returns false when offset is 0 (no swipe)", () => {
    expect(shouldTriggerDelete(0)).toBe(false);
  });

  it("returns false for a shallow swipe just under the threshold", () => {
    expect(shouldTriggerDelete(-SNAP_THRESHOLD + 1)).toBe(false);
    expect(shouldTriggerDelete(-1)).toBe(false);
  });

  it("returns false for positive offsets (right swipe)", () => {
    expect(shouldTriggerDelete(10)).toBe(false);
    expect(shouldTriggerDelete(100)).toBe(false);
  });
});

// ── isSwipeGesture ────────────────────────────────────────────────────────────

describe("isSwipeGesture", () => {
  it("returns false for zero movement", () => {
    expect(isSwipeGesture(0)).toBe(false);
  });

  it("returns false for movement within the tap tolerance", () => {
    expect(isSwipeGesture(MOVE_THRESHOLD - 1)).toBe(false);
    expect(isSwipeGesture(-(MOVE_THRESHOLD - 1))).toBe(false);
  });

  it("returns false when exactly at MOVE_THRESHOLD (boundary is exclusive)", () => {
    // isSwipeGesture uses strict >, so MOVE_THRESHOLD itself is still a tap.
    expect(isSwipeGesture(MOVE_THRESHOLD)).toBe(false);
    expect(isSwipeGesture(-MOVE_THRESHOLD)).toBe(false);
  });

  it("returns true when one pixel past MOVE_THRESHOLD", () => {
    expect(isSwipeGesture(MOVE_THRESHOLD + 1)).toBe(true);
    expect(isSwipeGesture(-(MOVE_THRESHOLD + 1))).toBe(true);
  });

  it("returns true for clearly swipe-sized movements", () => {
    expect(isSwipeGesture(50)).toBe(true);
    expect(isSwipeGesture(-70)).toBe(true);
  });
});
