"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import ConfirmDialog from "@frontend/components/ui/ConfirmDialog";
import {
  DELETE_ZONE_WIDTH,
  WHEEL_SNAP_DELAY,
  clampOffset,
  iconOpacity,
  shouldTriggerDelete,
  isSwipeGesture,
} from "@frontend/lib/swipeDeleteLogic";

interface Props {
  children: React.ReactNode;
  /** Called after the user confirms deletion. Return value is ignored. */
  onDelete: () => unknown;
  /** Heading shown in the confirmation dialog. */
  confirmTitle?: string;
  /** Body text shown in the confirmation dialog. */
  confirmMessage?: string;
  /** Label for the destructive confirm button. */
  confirmLabel?: string;
}

/**
 * Universal swipe-to-delete wrapper with three distinct interaction modes:
 *
 * 1. Touch (phone/tablet) — pointer swipe left. The foreground card tracks
 *    the finger in real time; releasing past SNAP_THRESHOLD opens a
 *    ConfirmDialog.
 *
 * 2. Trackpad (Mac two-finger horizontal scroll) — horizontal wheel events
 *    drive the same card animation. Snaps open or closed after the user
 *    stops scrolling (WHEEL_SNAP_DELAY ms of silence). Single-finger
 *    interactions on the trackpad generate pointer events with
 *    pointerType === "mouse" and are intentionally ignored here.
 *
 * 3. Mouse — pointer swipe is disabled (it conflicts with button clicks).
 *    Instead, a small trash icon button fades in on hover; clicking it
 *    opens the ConfirmDialog directly.
 *
 * All DOM mutations (transforms, opacity) are applied imperatively via refs
 * to avoid React re-renders on every animation frame.
 */
export default function SwipeToDelete({
  children,
  onDelete,
  confirmTitle = "Delete?",
  confirmMessage = "This action cannot be undone.",
  confirmLabel = "Delete",
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const foregroundRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);

  /** Mutable touch-swipe state kept in a ref to avoid re-renders on every move. */
  const drag = useRef({ active: false, startX: 0, hasMoved: false });

  /** Accumulated horizontal scroll offset driven by wheel events (trackpad). */
  const wheelAccumRef = useRef(0);
  /** Debounce timer that fires the snap after wheel scroll goes silent. */
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Latest-value ref for the wheel handler.
   *
   * The useEffect below attaches the wheel listener only once ([] deps) so
   * that we never add/remove during re-renders. To keep the handler's closure
   * up-to-date with the latest state (showConfirm, isPending) and functions
   * (snapOpen, snapClosed), we reassign this ref on every render and the
   * stable wrapper calls through to it.
   */
  const wheelHandlerRef = useRef<(e: WheelEvent) => void>(() => {});

  // ── DOM helpers ──────────────────────────────────────────────────────────────

  /**
   * Applies a CSS translateX transform directly to the foreground DOM element.
   * Transition is enabled on snaps; disabled during live drags/scrolls so the
   * element tracks the gesture exactly.
   */
  function applyTransform(offset: number, animate: boolean) {
    const el = foregroundRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.12s ease-out" : "none";
    el.style.transform = `translateX(${offset}px)`;
  }

  /**
   * Updates the delete-zone opacity directly on the DOM.
   * Transition is enabled on snaps; disabled during live drags/scrolls.
   */
  function applyIconOpacity(offset: number, animate: boolean) {
    const el = iconRef.current;
    if (!el) return;
    el.style.transition = animate ? "opacity 0.12s ease-out" : "none";
    el.style.opacity = String(iconOpacity(offset));
  }

  /** Snaps the card and delete zone back to the fully-closed resting state. */
  function snapClosed(animate: boolean) {
    applyTransform(0, animate);
    applyIconOpacity(0, animate);
  }

  /** Snaps the card and delete zone to the fully-open (delete-zone revealed) state. */
  function snapOpen() {
    applyTransform(-DELETE_ZONE_WIDTH, true);
    applyIconOpacity(-DELETE_ZONE_WIDTH, true);
  }

  // ── Trackpad: wheel event handling ───────────────────────────────────────────

  /**
   * Reassigned on every render so the stable wheel listener always calls into
   * the latest state and helper functions without needing to re-attach.
   *
   * Only reacts to predominantly horizontal scroll (|deltaX| > |deltaY|), which
   * is the signature of a two-finger horizontal swipe on a Mac trackpad.
   * A standard mouse scroll wheel only produces deltaY, so this never fires
   * for mouse-wheel users.
   *
   * deltaX sign convention (Mac, natural scrolling):
   *   positive deltaX → fingers moved left  → card should move left (negative offset)
   *   negative deltaX → fingers moved right → card should move right (back toward 0)
   */
  wheelHandlerRef.current = function handleWheel(e: WheelEvent) {
    if (showConfirm || isPending) return;
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;

    e.preventDefault(); // prevent the page from scrolling horizontally

    wheelAccumRef.current = clampOffset(wheelAccumRef.current, -e.deltaX);
    applyTransform(wheelAccumRef.current, false);
    applyIconOpacity(wheelAccumRef.current, false);

    // Fire immediately the moment the threshold is crossed — no debounce.
    // This eliminates the perceptible delay between the swipe gesture ending
    // and the confirm dialog appearing.
    if (shouldTriggerDelete(wheelAccumRef.current)) {
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      snapOpen();
      setShowConfirm(true);
      wheelAccumRef.current = 0;
      return;
    }

    // Below threshold — debounce the snap-back so small movements don't
    // immediately reset the card while the user is still gesturing.
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = setTimeout(() => {
      snapClosed(true);
      wheelAccumRef.current = 0;
    }, WHEEL_SNAP_DELAY);
  };

  /** Attach the non-passive wheel listener once; clean up on unmount. */
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => wheelHandlerRef.current(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => {
      el.removeEventListener("wheel", handler);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, []);

  // ── Mouse: snap closed when pointer leaves mid-wheel-swipe ───────────────────

  /**
   * If the pointer leaves the card while a trackpad swipe is in progress
   * (wheel accumulator is non-zero and confirm hasn't opened yet), snap closed
   * so the card doesn't get stuck mid-position.
   */
  function handlePointerLeave(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    if (!showConfirm && wheelAccumRef.current !== 0) {
      if (wheelTimerRef.current) {
        clearTimeout(wheelTimerRef.current);
        wheelTimerRef.current = null;
      }
      snapClosed(true);
      wheelAccumRef.current = 0;
    }
  }

  // ── Touch: pointer swipe handlers ────────────────────────────────────────────

  /**
   * Begins tracking a touch swipe. Pointer events from a mouse (pointerType ===
   * "mouse") are ignored because mouse users interact via the hover button and
   * trackpad users interact via wheel events. Capturing the pointer early
   * ensures pointermove/pointerup are reliably delivered even when the finger
   * travels outside the element during a fast swipe.
   */
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (showConfirm || isPending) return;
    if (e.pointerType === "mouse") return;
    drag.current = { active: true, startX: e.clientX, hasMoved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    applyTransform(0, false);
  }

  /**
   * Moves the foreground in real time during a touch swipe.
   * Offset is clamped to [−DELETE_ZONE_WIDTH, 0] — only left swipes are allowed.
   */
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const delta = e.clientX - drag.current.startX;
    if (isSwipeGesture(delta)) drag.current.hasMoved = true;
    const offset = clampOffset(0, delta);
    applyTransform(offset, false);
    applyIconOpacity(offset, false);
  }

  /**
   * On touch release:
   * - Pure tap (no significant horizontal movement) → snap closed; let child
   *   click handlers (navigation, buttons) fire normally.
   * - Swipe past SNAP_THRESHOLD → snap fully open + show ConfirmDialog.
   * - Shallow swipe → snap back to closed.
   */
  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    drag.current.active = false;

    if (!drag.current.hasMoved) {
      snapClosed(false);
      return;
    }

    const finalOffset = e.clientX - drag.current.startX;
    if (shouldTriggerDelete(finalOffset)) {
      snapOpen();
      setShowConfirm(true);
    } else {
      snapClosed(true);
    }
  }

  /** Resets drag state if the browser cancels the pointer (e.g., scroll takeover). */
  function handlePointerCancel() {
    if (!drag.current.active) return;
    drag.current.active = false;
    snapClosed(true);
  }

  // ── Confirm dialog handlers ───────────────────────────────────────────────────

  /** Executes `onDelete` after the user confirms, then resets everything. */
  async function handleConfirm() {
    setIsPending(true);
    await onDelete();
    setIsPending(false);
    setShowConfirm(false);
    snapClosed(true);
  }

  /** Cancels the deletion and snaps the card back to its resting state. */
  function handleCancel() {
    setShowConfirm(false);
    snapClosed(true);
  }

  return (
    <div
      ref={outerRef}
      className="relative overflow-hidden"
      onPointerLeave={handlePointerLeave}
    >
      {/*
       * Delete zone — anchored to the right, sits behind the foreground.
       * Revealed by touch swipe or trackpad wheel scroll.
       * pointer-events: none so it never intercepts clicks on card content.
       */}
      <div
        className="absolute inset-y-0 right-0 pointer-events-none"
        style={{ width: DELETE_ZONE_WIDTH }}
        aria-hidden="true"
      >
        <div
          ref={iconRef}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-500 text-white"
          style={{ opacity: 0 }}
        >
          {isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Trash2 size={18} />
              <span className="text-[10px] font-semibold leading-none">Delete</span>
            </>
          )}
        </div>
      </div>

      {/* Foreground draggable layer — wraps children */}
      <div
        ref={foregroundRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ touchAction: "pan-y" }}
        data-testid="swipe-item"
      >
        {children}
      </div>

      <ConfirmDialog
        open={showConfirm}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isPending={isPending}
      />
    </div>
  );
}
