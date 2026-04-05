/**
 * Pure logic functions for the SwipeToDelete component.
 *
 * Keeping these separate from the React component allows straightforward unit
 * testing in a Node environment (no DOM required) and makes the component
 * itself easier to read.
 */

/** Width of the red delete zone revealed on swipe, in pixels. */
export const DELETE_ZONE_WIDTH = 80;

/**
 * Swipe distance (px) at which the red zone starts becoming visible.
 * Set to 50% of DELETE_ZONE_WIDTH so the zone is hidden during shallow swipes
 * and only fades in once the user has committed to the gesture.
 */
export const SHOW_ZONE_THRESHOLD = DELETE_ZONE_WIDTH * 0.5;

/**
 * Minimum swipe distance (px) required for the release to trigger the delete
 * confirmation. Matches SHOW_ZONE_THRESHOLD so the zone appears at the same
 * point the gesture becomes actionable — iPhone-style behaviour.
 */
export const SNAP_THRESHOLD = DELETE_ZONE_WIDTH * 0.5;

/**
 * Minimum horizontal movement (px) that classifies a pointer interaction as a
 * swipe rather than a tap. Below this value the gesture is treated as a click.
 */
export const MOVE_THRESHOLD = 6;

/**
 * Clamps a raw drag offset into the permitted range.
 *
 * Only left-swipes are allowed (negative values). The foreground element can
 * travel at most DELETE_ZONE_WIDTH pixels to the left and cannot move right
 * past its resting position (0).
 *
 * @param startOffset - The element's offset at the start of the drag (always 0
 *   in the current design since there is no stable "open" state).
 * @param delta - Horizontal distance moved since pointerdown (negative = left).
 * @returns Clamped offset in the range [−DELETE_ZONE_WIDTH, 0].
 */
export function clampOffset(startOffset: number, delta: number): number {
  return Math.max(-DELETE_ZONE_WIDTH, Math.min(0, startOffset + delta));
}

/**
 * Calculates the delete-zone opacity for a given swipe offset.
 *
 * Returns 0 for any swipe shallower than SHOW_ZONE_THRESHOLD, then linearly
 * ramps from 0→1 between SHOW_ZONE_THRESHOLD and DELETE_ZONE_WIDTH. This
 * mirrors iPhone-style swipe-to-delete: the red background stays hidden until
 * the user has committed to the gesture.
 *
 * @param offset - Current translateX offset (negative = swiped left).
 * @returns Opacity value in [0, 1].
 */
export function iconOpacity(offset: number): number {
  const abs = Math.abs(offset);
  if (abs <= SHOW_ZONE_THRESHOLD) return 0;
  return Math.min(1, (abs - SHOW_ZONE_THRESHOLD) / (DELETE_ZONE_WIDTH - SHOW_ZONE_THRESHOLD));
}

/**
 * Returns true when a pointer-up event should trigger the delete confirmation.
 *
 * The user must have swiped the card past SNAP_THRESHOLD pixels to the left
 * for the gesture to be counted as a deliberate delete intent.
 *
 * @param finalOffset - Net horizontal distance at the time of pointer release.
 */
export function shouldTriggerDelete(finalOffset: number): boolean {
  return finalOffset <= -SNAP_THRESHOLD;
}

/**
 * Returns true when the accumulated horizontal movement classifies as a swipe
 * gesture rather than an accidental tap.
 *
 * @param totalDelta - Absolute horizontal distance moved (positive value).
 */
export function isSwipeGesture(totalDelta: number): boolean {
  return Math.abs(totalDelta) > MOVE_THRESHOLD;
}

/**
 * Milliseconds of silence after the last wheel event before the card snaps to
 * its final position. Keeps the snap feeling responsive without reacting to
 * every tiny acceleration change mid-gesture.
 */
export const WHEEL_SNAP_DELAY = 150;
