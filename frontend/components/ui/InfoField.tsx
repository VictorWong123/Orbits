interface Props {
  /** Uppercase label displayed above the value. */
  label: string;
  /** The text value to display. */
  value: string;
}

/**
 * Stacked label-on-top, value-below row used in the Info tab of ProfileTabs.
 * Renders a small all-caps accent-colored label with a larger semibold value.
 */
export default function InfoField({ label, value }: Props) {
  return (
    <div className="py-4">
      <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">
        {label}
      </p>
      <p className="text-base font-semibold text-[#1A3021] mt-0.5">{value}</p>
    </div>
  );
}
