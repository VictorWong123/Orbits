"use client";

import { useStoreAction } from "@frontend/hooks/useStoreAction";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
import SubmitButton from "@frontend/components/ui/SubmitButton";
import FormError from "@frontend/components/ui/FormError";
import PillInput from "@frontend/components/ui/PillInput";

interface Props {
  profileId: string;
  /** Called after a fact is successfully created so the parent can re-fetch. */
  onSuccess?: () => void;
}

/** Form to add a new fact about a person. */
export default function AddFactForm({ profileId, onSuccess }: Props) {
  const { store } = useDataStore();
  const { error, isPending, formRef, execute } = useStoreAction(
    (input: { profile_id: string; content: string; category: string }) =>
      store.createFact(input),
    onSuccess
  );

  /** Extracts field values and calls the store action. */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const content = (form.elements.namedItem("content") as HTMLInputElement).value.trim();
    const category = (form.elements.namedItem("category") as HTMLInputElement).value.trim();
    execute({ profile_id: profileId, content, category: category || "general" });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2">
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
