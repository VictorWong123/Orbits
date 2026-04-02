"use client";

import type { InputHTMLAttributes } from "react";

/** Visual style variants for PillInput. */
export type PillInputVariant = "colored" | "white";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * "colored" — themed primary-light background, suitable for forms that sit
   *   inside a colored container (fact/event forms, login fields).
   * "white"   — white background with gray border, suitable for forms on
   *   neutral/white backgrounds (profile add form, search bars).
   * Defaults to "colored".
   */
  variant?: PillInputVariant;
}

/** Tailwind class strings for each visual variant (visual styles only — no sizing). */
const VARIANT_CLASSES: Record<PillInputVariant, string> = {
  colored: [
    "bg-[var(--color-primary-light)]",
    "text-[#1A3021]",
    "placeholder:text-[var(--color-accent)]",
    "border-0",
    "focus:ring-[var(--color-accent)]",
  ].join(" "),
  white: [
    "bg-white",
    "text-[#1A3021]",
    "placeholder:text-[var(--color-accent)]",
    "border border-gray-200",
    "focus:ring-gray-200",
  ].join(" "),
};

/** Structural classes shared by every variant. */
const BASE_CLASSES = "rounded-full text-sm outline-none focus:ring-2";

/**
 * Pill-shaped text input that matches the app's visual style.
 *
 * Visual styling (colors, borders, focus ring) is handled internally via the
 * `variant` prop. Sizing, width, and layout (px, py, flex-1, w-full, etc.)
 * must be supplied by the caller through `className` so this component stays
 * agnostic about its context.
 *
 * All standard `<input>` attributes are forwarded to the underlying element.
 */
export default function PillInput({
  variant = "colored",
  className = "",
  ...props
}: Props) {
  return (
    <input
      {...props}
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}
