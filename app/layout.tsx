import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Quicksand } from "next/font/google";
import "../frontend/styles/globals.css";
import { getSettings } from "@backend/actions";
import { getPalette, paletteToStyleVars } from "@frontend/lib/theme";
import ThemeProvider from "@frontend/components/ui/ThemeProvider";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Orbit",
  description: "Your personal relationship manager",
};

/**
 * Root layout — applies the Cozy Garden base styles and bootstraps the theme.
 *
 * The user's saved palette is fetched server-side and written as inline CSS
 * custom properties on <body> so the correct colors are present in the
 * server-rendered HTML (no flash). ThemeProvider then takes over on the client
 * so palette changes via SettingsModal take effect without a page reload.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialPaletteId = "sage";
  try {
    const settings = await getSettings();
    if (settings?.palette_id) initialPaletteId = settings.palette_id;
  } catch {
    // No authenticated user or DB unavailable — fall back to default palette.
  }

  const themeVars = paletteToStyleVars(getPalette(initialPaletteId));

  return (
    <html lang="en">
      <body
        className={`${quicksand.className} bg-[#FDFBF7] text-[#1A3021] antialiased`}
        style={themeVars as CSSProperties}
      >
        <ThemeProvider initialPaletteId={initialPaletteId}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
