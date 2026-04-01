/** Defines the color tokens for a single visual palette. */
export interface ColorPalette {
  id: string;
  name: string;
  /** Main action color — buttons, active tabs, avatar fills. */
  primary: string;
  /** Darker shade for hover states. */
  primaryDark: string;
  /** Very light tint for input backgrounds and tab containers. */
  primaryLight: string;
  /** Medium tone for secondary text, labels, and tag pills. */
  accent: string;
}

export type PaletteId = "sage" | "ocean" | "lavender" | "rose" | "amber" | "slate";

/** All available palettes, keyed by ID for O(1) lookup. */
export const PALETTES: Record<PaletteId, ColorPalette> = {
  sage: {
    id: "sage",
    name: "Sage",
    primary: "#4F6F52",
    primaryDark: "#3d5940",
    primaryLight: "#f0f7f0",
    accent: "#86A789",
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    primary: "#2E6B9E",
    primaryDark: "#245480",
    primaryLight: "#EAF3FB",
    accent: "#6BA3C8",
  },
  lavender: {
    id: "lavender",
    name: "Lavender",
    primary: "#6B4F8A",
    primaryDark: "#553D6E",
    primaryLight: "#F2EDF8",
    accent: "#A98BC8",
  },
  rose: {
    id: "rose",
    name: "Rose",
    primary: "#8A4F6B",
    primaryDark: "#6E3D55",
    primaryLight: "#F8EDF2",
    accent: "#C88BAA",
  },
  amber: {
    id: "amber",
    name: "Amber",
    primary: "#8A6B2E",
    primaryDark: "#6E5424",
    primaryLight: "#FAF4E8",
    accent: "#C8A86B",
  },
  slate: {
    id: "slate",
    name: "Slate",
    primary: "#4F6B7A",
    primaryDark: "#3D5463",
    primaryLight: "#EDF2F5",
    accent: "#89A6B5",
  },
};

export const DEFAULT_PALETTE_ID: PaletteId = "sage";

/**
 * Returns the ColorPalette for the given ID.
 * Falls back to the default palette if the ID is unrecognised.
 */
export function getPalette(id: string): ColorPalette {
  return PALETTES[id as PaletteId] ?? PALETTES[DEFAULT_PALETTE_ID];
}

/**
 * Converts a ColorPalette into a CSS-in-JS style object containing the four
 * custom property declarations. Apply this to the `style` prop of the `<body>`
 * element so every component can reference `var(--color-primary)` etc.
 */
export function paletteToStyleVars(palette: ColorPalette): Record<string, string> {
  return {
    "--color-primary": palette.primary,
    "--color-primary-dark": palette.primaryDark,
    "--color-primary-light": palette.primaryLight,
    "--color-accent": palette.accent,
  };
}
