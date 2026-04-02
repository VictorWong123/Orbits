"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import FormError from "@frontend/components/ui/FormError";

interface Props {
  /**
   * Called when the button is clicked. Must return a Promise resolving to
   * an error string on failure or null on success. Pass a bound server action
   * via Next.js's .bind() pattern:
   *   <DeleteButton onDelete={deleteItem.bind(null, id, profileId)} ariaLabel="Delete item" />
   */
  onDelete: () => Promise<string | null>;
  ariaLabel: string;
}

/**
 * A small trash-icon button for inline delete actions.
 * Awaits the server action and displays any returned error string beneath
 * the button so failures are never silently discarded.
 */
export default function DeleteButton({ onDelete, ariaLabel }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /** Triggers the delete action and surfaces any error returned by the server. */
  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await onDelete();
      if (result) setError(result);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-gray-400 hover:text-red-500 disabled:opacity-50"
        aria-label={ariaLabel}
      >
        <Trash2 size={16} />
      </button>
      <FormError error={error} size="xs" className="max-w-[120px] text-right" />
    </div>
  );
}
