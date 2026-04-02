"use client";

import { UserPlus } from "lucide-react";
import { createProfile } from "@backend/actions";
import { useFormAction } from "@frontend/hooks/useFormAction";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";
import PillInput from "@frontend/components/ui/PillInput";

interface Props {
  /** Names of all existing profiles, used for duplicate-name detection. */
  existingNames: string[];
}

/** Form to add a new person to the user's orbit. Resets on success. */
export default function AddProfileForm({ existingNames }: Props) {
  const { error, formAction, isPending, formRef } = useFormAction(createProfile);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        /**
         * Intercepts form submission to warn the user when the entered name
         * already exists among their profiles. The user can choose to cancel
         * (duplicate entry) or confirm (intentionally different person).
         */
        const enteredName =
          (e.currentTarget.elements.namedItem("full_name") as HTMLInputElement)?.value?.trim() ?? "";
        const isDuplicate = existingNames.some(
          (name) => name.trim().toLowerCase() === enteredName.toLowerCase()
        );
        if (isDuplicate) {
          const confirmed = window.confirm(
            `You already have someone named "${enteredName}". Is this a different person?`
          );
          if (!confirmed) e.preventDefault();
        }
      }}
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
