'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Box, Code2, Layers, Terminal } from 'lucide-react';
import { useState } from 'react';

type CodeBlock = {
  label: string;
  value: string;
  iconName: 'terminal' | 'box' | 'layers' | 'code';
  description: string;
  codeHtml: string;
};

const iconMap = {
  terminal: Terminal,
  box: Box,
  layers: Layers,
  code: Code2,
};

export default function InteractiveUsage({ blocks }: { blocks: CodeBlock[] }) {
  const [activeTab, setActiveTab] = useState(blocks[0].value);
  const activeBlock = blocks.find((b) => b.value === activeTab) || blocks[0];
  return (
    <div className="grid lg:grid-cols-5 gap-8">
      {/* Sidebar / Tabs */}
      <div className="lg:col-span-2 space-y-4">
        {blocks.map((block) => {
          const Icon = iconMap[block.iconName];
          return (
            <button
              key={block.value}
              onClick={() => setActiveTab(block.value)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-start gap-4 group ${
                activeTab === block.value
                  ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <div
                className={`mt-1 p-2 rounded-lg transition-colors ${
                  activeTab === block.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 group-hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-semibold mb-1 ${activeTab === block.value ? 'text-white' : 'text-gray-300'}`}>
                  {block.label}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{block.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Code Window */}
      <div className="lg:col-span-3">
        <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden flex flex-col h-full min-h-[400px]">
          {/* Window Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black/20">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <div className="text-xs font-mono text-gray-500">
              {activeBlock.label.toLowerCase().replace(/\s+/g, '-')}.ts
            </div>
            <div className="w-12" /> {/* Spacer */}
          </div>

          {/* Code Content */}
          <div className="relative flex-1 bg-[#0d1117] p-6 overflow-x-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="font-mono text-sm"
                dangerouslySetInnerHTML={{ __html: activeBlock.codeHtml }}
              />
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
