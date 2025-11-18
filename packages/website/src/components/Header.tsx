'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/80 backdrop-blur supports-backdrop-filter:bg-white/60 dark:border-white/15 dark:bg-black/70">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded-md focus:bg-black focus:px-3 focus:py-1.5 focus:text-white dark:focus:bg-white dark:focus:text-black"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="#" className="flex items-center gap-2" aria-label="Motif-ts Home">
          <span className="text-xl font-semibold tracking-tight">Motif-ts</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="#philosophy"
            className="rounded-lg px-3 py-1.5 text-sm text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/10"
          >
            Philosophy
          </Link>
          <Link
            href="#usage"
            className="rounded-lg px-3 py-1.5 text-sm text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/10"
          >
            Usage
          </Link>
          <Link
            href="#features"
            className="rounded-lg px-3 py-1.5 text-sm text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/10"
          >
            Features
          </Link>
          <a
            href="https://github.com/rational-studio/motif-ts"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
