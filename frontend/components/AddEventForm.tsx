"use client";

import { useStoreAction } from "@frontend/hooks/useStoreAction";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";
import DateTimePicker from "@frontend/components/ui/DateTimePicker";
import PillInput from "@frontend/components/ui/PillInput";

interface Props {
  profileId: string;
  /** Called after an event is successfully created so the parent can re-fetch. */
  onSuccess?: () => void;
}

/** Form to add a new event for a person. */
export default function AddEventForm({ profileId, onSuccess }: Props) {
  const { store } = useDataStore();
  const { error, isPending, formRef, execute } = useStoreAction(
    (input: { profile_id: string; title: string; event_date: string; notes?: string }) =>
      store.createEvent(input),
    onSuccess
  );

  /** Extracts field values and calls the store action. */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
    const event_date = (form.elements.namedItem("event_date") as HTMLInputElement).value.trim();
    const notes = (form.elements.namedItem("notes") as HTMLInputElement).value.trim();
    execute({ profile_id: profileId, title, event_date, notes: notes || undefined });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2">
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
