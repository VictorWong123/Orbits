"use client";

import { createFact } from "@backend/actions";
import { useFormAction } from "@frontend/hooks/useFormAction";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";

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
        <input
          name="content"
          type="text"
          placeholder="Add a fact..."
          required
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <input
          name="category"
          type="text"
          placeholder="Category (optional)"
          className="w-36 border rounded px-3 py-2 text-sm"
        />
        <SubmitButton isPending={isPending} label="Add" pendingLabel="..." />
      </div>
      <FormError error={error} />
    </form>
  );
}
