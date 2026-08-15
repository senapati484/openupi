import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'OpenUPI Admin Dashboard',
  description: 'Self-hosted zero-fee UPI payment gateway management console',
  icons: {
    icon: '/openupi.png',
    shortcut: '/openupi.png',
    apple: '/openupi.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0f172a' }}>
        {children}
      </body>
    </html>
  );
}
