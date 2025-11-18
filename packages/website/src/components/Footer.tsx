export default function Footer() {
  return (
    <footer className="mx-auto max-w-7xl border-t border-black/10 px-6 py-12 text-sm text-black/60 dark:border-white/15 dark:text-white/60">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div>MIT License • © Rational Studio</div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/rational-studio/motif-ts"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            GitHub
          </a>
          <a
            href="https://github.com/rational-studio/motif-ts#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Documentation
          </a>
        </div>
      </div>
    </footer>
  );
}
