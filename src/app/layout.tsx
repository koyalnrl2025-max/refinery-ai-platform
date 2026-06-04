import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RefineIQ — AI Refinery Operations Platform',
  description: 'AI-first refinery operations platform powered by RefineIQ Engine',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} style={{ height: '100%' }}>
      <body style={{ height: '100%' }}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
