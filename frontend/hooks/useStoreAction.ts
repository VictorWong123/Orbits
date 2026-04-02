"use client";

import { useRef, useState, useTransition } from "react";

/** Any async function that returns an error string on failure or null on success. */
type StoreAction<T> = (input: T) => Promise<string | null>;

interface UseStoreActionResult<T> {
  /** The latest error message returned by the action, or null if the last call succeeded. */
  error: string | null;
  /** True while the action is in-flight. */
  isPending: boolean;
  /** Attach to the `<form>` element to enable auto-reset on success. */
  formRef: React.RefObject<HTMLFormElement | null>;
  /**
   * Invoke the action with the given input. Clears any previous error,
   * calls the action, shows the returned error string (if any), and resets
   * the form on success. Calls `onSuccess` after a successful action.
   */
  execute: (input: T) => void;
}

/**
 * Manages pending state, error display, and form reset for a single store
 * mutation. Designed to replace `useFormAction` for components that call
 * `DataStore` methods instead of server actions.
 *
 * @param action    - Store method to invoke, e.g. `store.createFact.bind(store)`.
 * @param onSuccess - Optional callback invoked after a successful action (e.g.
 *   to trigger a parent re-fetch).
 */
export function useStoreAction<T>(
  action: StoreAction<T>,
  onSuccess?: () => void
): UseStoreActionResult<T> {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  /** Executes the store action and handles the result. */
  function execute(input: T) {
    setError(null);
    startTransition(async () => {
      const result = await action(input);
      if (result) {
        setError(result);
      } else {
        formRef.current?.reset();
        onSuccess?.();
      }
    });
  }

  return { error, isPending, formRef, execute };
}
