"use client";

import { useCallback } from "react";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import { useStoreAction } from "@frontend/hooks/useStoreAction";
import PillInput from "@frontend/components/ui/PillInput";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";

interface Props {
  /** Called after a friend request is successfully sent. */
  onSuccess: () => void;
}

/**
 * Inline form for sending a friend request by Orbit ID (UUID).
 *
 * The recipient shares their Orbit ID from the /account page. Delegates to
 * `store.sendFriendRequest()` via `useStoreAction`. On success the form is
 * reset and the parent is notified. On failure the error is displayed inline.
 */
export default function AddFriendForm({ onSuccess }: Props) {
  const { store } = useDataStore();

  const action = useCallback(
    (orbitId: string) => store.sendFriendRequest(orbitId),
    [store]
  );

  const { error, isPending, formRef, execute } = useStoreAction(action, onSuccess);

  /**
   * Reads the Orbit ID from the form and fires the store action.
   * Prevents default form submission so the page does not navigate.
   */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const orbitId = (data.get("orbitId") as string | null)?.trim() ?? "";
    execute(orbitId);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <PillInput
          variant="white"
          name="orbitId"
          type="text"
          placeholder="Enter 8-character code"
          maxLength={8}
          required
          disabled={isPending}
          className="flex-1 text-sm font-mono tracking-widest uppercase"
        />
        <SubmitButton
          isPending={isPending}
          label="Connect"
          pendingLabel="Connecting…"
          className="bg-[var(--color-primary)] text-white font-semibold py-2 px-4 rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        />
      </div>
      {error && <FormError error={error} />}
    </form>
  );
}
