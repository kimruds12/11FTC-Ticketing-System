import type { Metadata } from 'next';

import '@/styles/globals.css';

export const metadata: Metadata = {
  title: '11FTC Ticketing System',
  description:
    'IT ticket encoding, monitoring, reporting, and analytics for the 11FTC IT department.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
