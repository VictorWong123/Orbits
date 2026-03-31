"use client";

import { UserPlus } from "lucide-react";
import { createProfile } from "@backend/actions";
import { useFormAction } from "@frontend/hooks/useFormAction";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";

/** Form to add a new person to the user's orbit. Resets on success. */
export default function AddProfileForm() {
  const { error, formAction, isPending, formRef } = useFormAction(createProfile);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 border rounded p-4">
      <h2 className="font-semibold flex items-center gap-2">
        <UserPlus size={18} />
        Add a Person
      </h2>

      <div className="flex gap-2">
        <input
          name="full_name"
          type="text"
          placeholder="Full name"
          required
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <input
          name="birthday"
          type="date"
          className="border rounded px-3 py-2 text-sm"
        />
      </div>

      <FormError error={error} />

      <SubmitButton
        isPending={isPending}
        label="Add Person"
        pendingLabel="Adding..."
        className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
      />
    </form>
  );
}
