"use client";

import { useState, useTransition } from "react";

interface Props {
  /**
   * The display name of the profile being deleted, used in the confirmation
   * dialog message.
   */
  profileName: string;
  /**
   * The bound server action to invoke after the user confirms deletion.
   * Must return a Promise resolving to an error string on failure.
   */
  action: () => Promise<string>;
}

/**
 * A "Delete person" button that runs in the browser so it can show a
 * window.confirm dialog before submitting the server action.
 *
 * This component must be a Client Component because Server Components cannot
 * attach event handlers — the onClick would be stripped at serialization time.
 */
export default function DeleteProfileButton({ profileName, action }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /** Shows a confirmation dialog, then invokes the delete action if confirmed. */
  function handleClick() {
    if (!confirm(`Delete ${profileName}? This cannot be undone.`)) return;

    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result) setError(result);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-sm text-red-500 underline disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Delete person"}
      </button>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
