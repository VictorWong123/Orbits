"use client";

import { type RefObject, useEffect } from "react";

/**
 * Attaches a `mousedown` listener that fires `callback` whenever the user
 * clicks outside the element referenced by `ref`. The listener is only active
 * while `isActive` is true, avoiding stale global listeners.
 *
 * IMPORTANT: `callback` must be a stable reference (wrap with `useCallback`)
 * to prevent the effect from re-subscribing on every render.
 *
 * @param ref      - Ref pointing to the container element.
 * @param callback - Function to invoke on an outside click.
 * @param isActive - Whether the listener should be attached.
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  isActive: boolean
): void {
  useEffect(() => {
    /** Calls callback when a mousedown occurs outside the ref element. */
    function handleMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    if (isActive) {
      document.addEventListener("mousedown", handleMouseDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [ref, callback, isActive]);
}
