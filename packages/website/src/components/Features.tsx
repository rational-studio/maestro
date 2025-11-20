'use client';

import { motion } from 'framer-motion';
import { GitMerge, History, LayoutTemplate, Terminal } from 'lucide-react';

const FEATURES = [
  {
    title: 'Workflow Orchestrator',
    description: 'Compose steps with typed transitions, back navigation, lifecycle control, and middleware hooks.',
    icon: GitMerge,
  },
  {
    title: 'DevTools & Persist',
    description: 'Use Redux DevTools time travel, export/import workflow snapshots, and restore states safely.',
    icon: History,
  },
  {
    title: 'Framework Adapters',
    description:
      'Use adapters to integrate with your UI of choice. React is supported, and the core works with any framework.',
    icon: LayoutTemplate,
  },
  {
    title: 'Expression Engine',
    description:
      'Modern JS features including optional chaining, template literals, and object spread for dynamic rules.',
    icon: Terminal,
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Everything you need <br />
            <span className="text-gray-500">to build complex flows.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center mb-4 text-gray-300 group-hover:text-white group-hover:bg-gray-700 transition-all">
                  <feature.icon className="w-5 h-5" />
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
