"use client";

interface Props {
  error: string | null;
}

/**
 * Renders a validation/action error message beneath a form field.
 * Renders nothing when error is null.
 */
export default function FormError({ error }: Props) {
  if (!error) return null;
  return <p className="text-sm text-red-600">{error}</p>;
}
