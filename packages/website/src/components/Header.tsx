'use client';

import { Github } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md supports-[backdrop-filter]:bg-black/20">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded-md focus:bg-white focus:px-3 focus:py-1.5 focus:text-black focus:z-50"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="#" className="flex items-center gap-2 group" aria-label="Motif-ts Home">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
            M
          </div>
          <span className="text-xl font-bold tracking-tight text-white">motif-ts</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="#philosophy" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Philosophy
          </Link>
          <Link href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Features
          </Link>
          <Link href="#usage" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Usage
          </Link>

          <div className="h-4 w-px bg-white/10" />

          <a
            href="https://github.com/rational-studio/motif-ts"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition-all border border-white/5"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
