"use client";

import { createEvent } from "@backend/actions";
import { useFormAction } from "@frontend/hooks/useFormAction";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";
import DateTimePicker from "@frontend/components/ui/DateTimePicker";
import PillInput from "@frontend/components/ui/PillInput";

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
        <PillInput
          name="title"
          type="text"
          placeholder="Event title"
          required
          className="flex-1 min-w-0 px-4 py-2.5"
        />
        <DateTimePicker name="event_date" placeholder="Date & time" />
      </div>
      <div className="flex gap-2">
        <PillInput
          name="notes"
          type="text"
          placeholder="Notes (optional)"
          className="flex-1 px-4 py-2.5"
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
