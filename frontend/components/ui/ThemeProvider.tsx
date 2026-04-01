"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getPalette, DEFAULT_PALETTE_ID, paletteToStyleVars, type PaletteId } from "@frontend/lib/theme";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  paletteId: PaletteId;
  /**
   * Updates the active palette and immediately re-applies CSS custom
   * properties to the document root.
   */
  setPaletteId: (id: PaletteId) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  paletteId: DEFAULT_PALETTE_ID,
  setPaletteId: () => {},
});

/** Returns the current theme context. Must be rendered inside a ThemeProvider. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

interface Props {
  /** Palette ID read from the database server-side and passed in as the seed. */
  initialPaletteId: string;
  children: ReactNode;
}

/**
 * Provides ThemeContext and keeps the CSS custom properties on the document
 * root in sync with the active palette. Whenever `paletteId` changes, the
 * four `--color-*` variables are updated so every Tailwind `var(--color-*)`
 * reference re-renders without a page reload.
 *
 * The body already has the correct inline styles set server-side (from
 * layout.tsx), so there is no visible flash of the default palette on mount.
 */
export default function ThemeProvider({ initialPaletteId, children }: Props) {
  const [paletteId, setPaletteId] = useState<PaletteId>(
    (initialPaletteId as PaletteId) ?? DEFAULT_PALETTE_ID
  );

  useEffect(() => {
    const vars = paletteToStyleVars(getPalette(paletteId));
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [paletteId]);

  return (
    <ThemeContext.Provider value={{ paletteId, setPaletteId }}>
      {children}
    </ThemeContext.Provider>
  );
}
