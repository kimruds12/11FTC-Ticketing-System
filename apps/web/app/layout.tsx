import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "11FTC | IT Support System",
  description: "11FTC IT Ticketing Management System — Internal IT ticketing, monitoring, and analytics.",
};

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
