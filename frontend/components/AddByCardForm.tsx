"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import PillInput from "@frontend/components/ui/PillInput";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";
import { useState } from "react";

// UUID v4 pattern — used to validate card IDs before navigating.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Form for importing a person by their shareable card ID.
 *
 * Validates that the input looks like a UUID, then navigates to
 * `/share/[id]` where the user can preview the card and confirm the import.
 * Using a navigation-based approach (rather than calling the action directly)
 * lets the user see the card details before committing.
 */
export default function AddByCardForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  /**
   * Validates the card ID and navigates to the share preview page.
   * A full UUID is required — short codes are not supported here since
   * card IDs are full UUIDs, not 8-character Orbit codes.
   */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const data = new FormData(e.currentTarget);
    const cardId = (data.get("cardId") as string | null)?.trim() ?? "";

    if (!UUID_REGEX.test(cardId)) {
      setError("Please enter a valid card ID (the full UUID from a share link).");
      return;
    }

    setIsPending(true);
    router.push(`/share/${cardId}`);
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <QrCode size={16} className="text-[var(--color-accent)] shrink-0" />
        <h2 className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wide">
          Add by Card ID
        </h2>
      </div>
      <p className="text-xs text-gray-400">
        Paste a card ID from someone&apos;s share link to preview and add them.
      </p>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <PillInput
            variant="white"
            name="cardId"
            type="text"
            placeholder="Paste card ID…"
            required
            disabled={isPending}
            className="flex-1 text-sm font-mono text-xs"
          />
          <SubmitButton
            isPending={isPending}
            label="View"
            pendingLabel="…"
            className="bg-[var(--color-primary)] text-white font-semibold py-2 px-4 rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          />
        </div>
        {error && <FormError error={error} size="xs" />}
      </form>
    </div>
  );
}
