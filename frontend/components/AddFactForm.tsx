"use client";

import { createFact } from "@backend/actions";
import { useFormAction } from "@frontend/hooks/useFormAction";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";
import PillInput from "@frontend/components/ui/PillInput";

interface Props {
  profileId: string;
}

/** Form to add a new fact about a person. */
export default function AddFactForm({ profileId }: Props) {
  const { error, formAction, isPending, formRef } = useFormAction(createFact);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="profile_id" value={profileId} />
      <div className="flex gap-2">
        <PillInput
          name="content"
          type="text"
          placeholder="Add a note..."
          required
          className="flex-1 px-4 py-2.5"
        />
        <PillInput
          name="category"
          type="text"
          placeholder="Category"
          className="w-28 px-4 py-2.5"
        />
        <SubmitButton
          isPending={isPending}
          label="Add"
          pendingLabel="..."
          className="bg-[var(--color-primary)] text-white rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-[var(--color-primary-dark)] transition-colors shrink-0"
        />
      </div>
      <FormError error={error} />
    </form>
  );
}
