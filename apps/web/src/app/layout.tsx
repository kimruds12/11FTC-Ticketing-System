import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/store/StoreProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "FTraCe — 11FTC IT Support System",
  description: "11FTC IT Ticketing Management System",
};

/**
 * `viewportFit: "cover"` is the switch that makes `env(safe-area-inset-*)` resolve to
 * anything other than zero; without it the safe-area rules in globals.css are inert on a
 * notched phone. Next injects a default viewport tag only until this export exists, so the
 * width/scale below are restated deliberately rather than inherited.
 *
 * `maximumScale` is left alone on purpose: capping zoom is an accessibility failure, and
 * the 16px input floor already removes the iOS auto-zoom this is usually (wrongly) used for.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#B91C1C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface text-gray-900 antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
