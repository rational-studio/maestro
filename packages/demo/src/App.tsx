import { NavLink, Route, Routes } from 'react-router-dom';

import ThemeToggle from './components/ThemeToggle';
import StepsDemo from './demos/StepsDemo';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-700 dark:bg-slate-900/70 supports-[backdrop-filter]:dark:bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold tracking-tight text-brand">Motif/Core 演示</h1>
          <div className="flex items-center gap-3">
            <nav className="flex gap-2">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                步骤与工作流
              </NavLink>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<StepsDemo />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
