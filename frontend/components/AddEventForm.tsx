"use client";

import { createEvent } from "@backend/actions";
import { useFormAction } from "@frontend/hooks/useFormAction";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";

interface Props {
  profileId: string;
}

/** Form to add a new event for a person. */
export default function AddEventForm({ profileId }: Props) {
  const { error, formAction, isPending, formRef } = useFormAction(createEvent);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="profile_id" value={profileId} />
      <div className="flex gap-2 flex-wrap">
        <input
          name="title"
          type="text"
          placeholder="Event title"
          required
          className="flex-1 min-w-0 border rounded px-3 py-2 text-sm"
        />
        <input
          name="event_date"
          type="datetime-local"
          required
          className="border rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <input
          name="notes"
          type="text"
          placeholder="Notes (optional)"
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <SubmitButton isPending={isPending} label="Add" pendingLabel="..." />
      </div>
      <FormError error={error} />
    </form>
  );
}
