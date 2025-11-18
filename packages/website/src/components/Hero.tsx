import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-12 sm:pt-24 sm:pb-16" aria-labelledby="hero-title">
      <div className="mx-auto max-w-3xl text-center sm:text-left">
        <h1 id="hero-title" className="text-4xl font-bold tracking-tight sm:text-5xl">
          Motif-ts
        </h1>
        <p className="mt-3 text-lg font-medium text-black dark:text-white">
          Dead Simple. Fully Typed. Effortlessly Orchestrated.
        </p>
        <p className="mt-2 text-base text-black/70 dark:text-white/70">
          A framework-agnostic workflow orchestrator and expression engine for reliable, composable application logic.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href="https://github.com/rational-studio/motif-ts"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
            aria-label="Open Motif-ts on GitHub"
          >
            GitHub
          </a>
          <a
            href="https://github.com/rational-studio/motif-ts#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-black/10 px-5 text-sm font-medium text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            aria-label="Open Motif-ts Documentation"
          >
            Documentation
          </a>
          <Link
            href="#usage"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-black/10 px-5 text-sm font-medium text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            aria-label="Jump to Installation"
          >
            Installation
          </Link>
        </div>
      </div>
    </section>
  );
}
