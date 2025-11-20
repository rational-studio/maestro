'use client';

import { motion } from 'framer-motion';
import { Layers, LocateFixed, Package, ShieldCheck, Workflow, Zap } from 'lucide-react';

const PHILOSOPHY_ITEMS = [
  {
    title: 'Workflows as Graphs',
    description:
      'Build logic with explicit steps and edges. Each transition is deterministic and type-checked, making complex flows understandable and testable.',
    icon: Workflow,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    title: 'Type-Safety End-to-End',
    description:
      'Strong TypeScript APIs ensure inputs, states, and transitions are safe. Zod integration adds runtime validation without compromising ergonomics.',
    icon: ShieldCheck,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    title: 'Immutability',
    description:
      'State updates are immutable by default, powered by Zustand. This ensures predictable state changes and enables powerful features like time-travel debugging.',
    icon: Package,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
  {
    title: 'Colocation',
    description:
      'Keep your logic, types, and UI close together. Steps are self-contained units that are easy to reason about, test, and reuse across your application.',
    icon: LocateFixed,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    title: 'Framework Agnostic',
    description:
      'The core is UI-agnostic and works in any framework or runtime. Optional adapters integrate with different UIs (React included) without coupling.',
    icon: Layers,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    title: 'Fast Expression Engine',
    description:
      'A compact JS expression parser powers dynamic rules and templates, supporting modern language features with competitive performance.',
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
];

export default function Philosophy() {
  return (
    <section id="philosophy" className="py-24 px-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Core Philosophy
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Built on first principles to solve the complexity of state management and workflow orchestration.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {PHILOSOPHY_ITEMS.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-all group"
            >
              <div
                className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
              <p className="text-gray-400 leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
