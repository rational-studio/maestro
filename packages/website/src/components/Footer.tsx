import { Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm mt-24">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">motif-ts</h3>
            <p className="text-sm text-gray-400 max-w-md">
              Dead Simple. Fully Typed. Effortlessly Orchestrated.
              <br />
              Built for reliability and developer experience.
            </p>
          </div>

          <div className="flex flex-col md:items-end gap-4">
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/rational-studio/motif-ts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <a
                href="https://github.com/rational-studio/motif-ts#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Documentation
              </a>
            </div>
            <div className="text-xs text-gray-500">MIT License • © {new Date().getFullYear()} Rational Studio</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
