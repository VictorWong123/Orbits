import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Quicksand } from "next/font/google";
import { cookies } from "next/headers";
import "../frontend/styles/globals.css";
import { getSettings } from "@backend/actions";
import { getPalette, paletteToStyleVars } from "@frontend/lib/theme";
import ThemeProvider from "@frontend/components/ui/ThemeProvider";
import { StoreProvider } from "@frontend/lib/store/StoreProvider";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Orbit",
  description: "Your personal relationship manager",
};

/**
 * Root layout — applies the Cozy Garden base styles and bootstraps the theme.
 *
 * Palette resolution order (highest → lowest priority):
 * 1. Supabase user_settings (authenticated users)
 * 2. `orbits_palette` cookie (set client-side by both stores on every change)
 * 3. "sage" default
 *
 * Writing the palette to a cookie prevents a FOUC for local (unauthenticated)
 * users who have changed their palette, since the server-rendered HTML includes
 * the correct CSS variables before JavaScript hydrates.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialPaletteId = "sage";
  try {
    const settings = await getSettings();
    if (settings?.palette_id) {
      initialPaletteId = settings.palette_id;
    } else {
      // Fall back to the cookie written by the client-side stores.
      const cookieStore = await cookies();
      const cookiePalette = cookieStore.get("orbits_palette")?.value;
      if (cookiePalette) initialPaletteId = cookiePalette;
    }
  } catch {
    // No authenticated user or DB unavailable — try the cookie fallback.
    try {
      const cookieStore = await cookies();
      const cookiePalette = cookieStore.get("orbits_palette")?.value;
      if (cookiePalette) initialPaletteId = cookiePalette;
    } catch {
      // Cookie read also failed — use the default palette.
    }
  }

  const themeVars = paletteToStyleVars(getPalette(initialPaletteId));

  return (
    <html lang="en">
      <body
        className={`${quicksand.className} bg-[#FDFBF7] text-[#1A3021] antialiased`}
        style={themeVars as CSSProperties}
      >
        <StoreProvider>
          <ThemeProvider initialPaletteId={initialPaletteId}>
            {children}
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
