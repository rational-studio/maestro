import './globals.css';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import Footer from '../components/Footer';
import Header from '../components/Header';

export const metadata: Metadata = {
  title: {
    default: 'Motif-ts',
    template: '%s | Motif-ts',
  },
  description:
    'Dead Simple. Fully Typed. Effortlessly Orchestrated. Motif-ts is a framework-agnostic workflow orchestrator and expression engine for reliable, composable application logic.',
  keywords: [
    'Motif-ts',
    'workflow',
    'orchestrator',
    'TypeScript',
    'typed workflows',
    'expression engine',
    'react',
    'middleware',
    'time travel',
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Motif-ts',
    description:
      'Dead Simple. Fully Typed. Effortlessly Orchestrated. Motif-ts is a framework-agnostic workflow orchestrator and expression engine for reliable, composable application logic.',
    url: '/',
    siteName: 'Motif-ts',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Motif-ts',
    description:
      'Dead Simple. Fully Typed. Effortlessly Orchestrated. Motif-ts is a framework-agnostic workflow orchestrator and expression engine for reliable, composable application logic.',
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0c10] text-white antialiased">
        <Header />
        <main id="content">{children}</main>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
