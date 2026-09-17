import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider }         from '@/providers/query-provider';
import { ServiceWorkerRegister } from './_components/sw-register';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'POS System',
  description: 'Multi-tenant Point of Sale System',
  manifest: '/manifest.json',
  themeColor: '#4f46e5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>
        <ServiceWorkerRegister />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
