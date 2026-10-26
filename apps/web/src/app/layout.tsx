import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Enterprise Chat - Internal Company Platform',
  description: 'Secure Real-time Communication Platform for Enterprises',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="h-screen w-screen overflow-hidden antialiased select-none">
        {children}
      </body>
    </html>
  );
}
