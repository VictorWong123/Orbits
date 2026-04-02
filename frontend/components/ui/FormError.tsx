"use client";

/** Text-size variants for FormError. */
type FormErrorSize = "sm" | "xs";

/** Visual style variants for FormError. */
type FormErrorVariant = "plain" | "highlighted";

interface Props {
  /** The error string to display. Renders nothing when null. */
  error: string | null;
  /**
   * Controls text size.
   * "sm" → text-sm (default), "xs" → text-xs.
   */
  size?: FormErrorSize;
  /**
   * Controls background treatment.
   * "plain" → red text only (default).
   * "highlighted" → red text with a red-50 pill background, used on the login page.
   */
  variant?: FormErrorVariant;
  /** Additional Tailwind classes appended to the root element. */
  className?: string;
}

const SIZE_CLASSES: Record<FormErrorSize, string> = {
  sm: "text-sm",
  xs: "text-xs",
};

const VARIANT_CLASSES: Record<FormErrorVariant, string> = {
  plain: "text-red-500",
  highlighted: "text-red-500 bg-red-50 rounded-2xl px-4 py-2.5",
};

/**
 * Renders a validation or server-action error message.
 * Renders nothing when `error` is null.
 *
 * Use `size` to control text size and `variant` to switch between a plain
 * inline message and a highlighted pill background (e.g., the login page).
 * Pass `className` for additional positioning or layout overrides.
 */
export default function FormError({
  error,
  size = "sm",
  variant = "plain",
  className = "",
}: Props) {
  if (!error) return null;

  return (
    <p className={`${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}>
      {error}
    </p>
  );
}
