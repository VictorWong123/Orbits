"use client";

import { useState, useTransition } from "react";
import FormError from "@frontend/components/ui/FormError";
import ConfirmDialog from "@frontend/components/ui/ConfirmDialog";

interface Props {
  /**
   * The display name of the profile being deleted, used in the confirmation
   * dialog message.
   */
  profileName: string;
  /**
   * The bound server action to invoke after the user confirms deletion.
   * Must return a Promise resolving to an error string on failure, or empty
   * string on success.
   */
  action: () => Promise<string>;
}

/**
 * A "Delete person" button that opens a styled confirmation dialog before
 * invoking the delete action.
 *
 * Replaces the native window.confirm() with ConfirmDialog for a consistent
 * look and feel. The dialog is controlled by local state; confirming triggers
 * the server action via useTransition.
 */
export default function DeleteProfileButton({ profileName, action }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  /** Runs the delete action after the user confirms in the dialog. */
  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result) {
        setError(result);
        setShowDialog(false);
      }
      // On success the parent calls router.push(), unmounting this component.
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setShowDialog(true)}
        disabled={isPending}
        className="text-xs font-medium text-[var(--color-accent)] hover:text-red-400 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Deleting…" : "Delete person"}
      </button>
      <FormError error={error} size="xs" />
      <ConfirmDialog
        open={showDialog}
        title="Delete person?"
        message={`"${profileName}" and all their notes and events will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleConfirm}
        onCancel={() => setShowDialog(false)}
        isPending={isPending}
      />
    </div>
  );
}
