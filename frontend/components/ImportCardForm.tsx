"use client";

import { useActionState } from "react";
import FormError from "@frontend/components/ui/FormError";
import SubmitButton from "@frontend/components/ui/SubmitButton";

type ImportAction = (_prevState: string | null, _formData: FormData) => Promise<string>;

interface Props {
  /** The bound server action `importSharedCard.bind(null, cardId)` wrapped to match useActionState's signature. */
  action: ImportAction;
}

/**
 * Client component that wraps the `importSharedCard` server action in
 * `useActionState` so that error messages can be displayed inline without
 * navigating away from the share page.
 *
 * On success `importSharedCard` calls `redirect()` internally, so this
 * component is only visible when the action fails (e.g. network error, card
 * already imported).
 */
export default function ImportCardForm({ action }: Props) {
  const [error, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-3">
      {error && <FormError error={error} />}
      <SubmitButton
        isPending={isPending}
        label="Add to my Orbit"
        pendingLabel="Adding…"
        className="w-full bg-[var(--color-primary)] text-white font-semibold py-3 rounded-full text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      />
    </form>
  );
}
