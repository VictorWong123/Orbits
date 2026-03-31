import type { Metadata } from "next";
import "../frontend/styles/globals.css";

export const metadata: Metadata = {
  title: "Orbit",
  description: "Your personal relationship manager",
};

/** Root layout — wraps every page. */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
