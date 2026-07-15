import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "11FTC Ticketing",
  description: "11FTC IT Ticketing Management System",
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
