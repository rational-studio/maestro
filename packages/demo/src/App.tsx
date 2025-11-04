import { Route, Routes, NavLink } from 'react-router-dom';
import './App.css';
import StepsDemo from './demos/StepsDemo';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Motif/Core 演示</h1>
          <nav className="flex gap-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1 rounded ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'}`
              }
            >
              步骤与工作流
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<StepsDemo />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
