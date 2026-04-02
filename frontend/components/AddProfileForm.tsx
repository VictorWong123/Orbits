"use client";

import { UserPlus } from "lucide-react";
import { useStoreAction } from "@frontend/hooks/useStoreAction";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";
import PillInput from "@frontend/components/ui/PillInput";

interface Props {
  /** Names of all existing profiles, used for duplicate-name detection. */
  existingNames: string[];
  /** Called after a profile is successfully created so the parent can re-fetch. */
  onSuccess?: () => void;
}

/** Form to add a new person to the user's orbit. Resets on success. */
export default function AddProfileForm({ existingNames, onSuccess }: Props) {
  const { store } = useDataStore();
  const { error, isPending, formRef, execute } = useStoreAction(
    (input: { full_name: string }) => store.createProfile(input),
    onSuccess
  );

  /** Extracts field values and calls the store action. */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const full_name = (form.elements.namedItem("full_name") as HTMLInputElement).value.trim();

    const isDuplicate = existingNames.some(
      (name) => name.trim().toLowerCase() === full_name.toLowerCase()
    );
    if (isDuplicate) {
      const confirmed = window.confirm(
        `You already have someone named "${full_name}". Is this a different person?`
      );
      if (!confirmed) return;
    }

    execute({ full_name });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-white rounded-3xl shadow-sm p-6 space-y-4"
    >
      <h2 className="text-sm font-bold text-[#1A3021] flex items-center gap-2">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-primary-light)]">
          <UserPlus size={14} className="text-[var(--color-primary)]" />
        </span>
        Add a person
      </h2>

      <PillInput
        variant="white"
        name="full_name"
        type="text"
        placeholder="Full name"
        required
        className="w-full px-4 py-2.5"
      />

      <FormError error={error} />

      <SubmitButton
        isPending={isPending}
        label="Add person"
        pendingLabel="Adding..."
        className="bg-[var(--color-primary)] text-white rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-[var(--color-primary-dark)] transition-colors"
      />
    </form>
  );
}
