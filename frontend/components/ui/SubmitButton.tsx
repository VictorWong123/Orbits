"use client";

interface Props {
  isPending: boolean;
  label: string;
  pendingLabel: string;
  className?: string;
}

/**
 * A submit button that reflects pending state from useActionState.
 * Disables itself while the action is in-flight.
 */
export default function SubmitButton({
  isPending,
  label,
  pendingLabel,
  className = "bg-black text-white rounded px-3 py-2 text-sm disabled:opacity-50",
}: Props) {
  return (
    <button type="submit" disabled={isPending} className={className}>
      {isPending ? pendingLabel : label}
    </button>
  );
}
