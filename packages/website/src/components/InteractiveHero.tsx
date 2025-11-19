'use client';

import { useCallback, useState } from 'react';
import ReactFlow, { Background, Controls, Edge, Node, useEdgesState, useNodesState } from 'reactflow';

import 'reactflow/dist/style.css';

import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

import MotifStepNode, { MotifStepData } from './MotifStepNode';

const nodeTypes = {
  motifStep: MotifStepNode,
};

const initialNodes: Node<MotifStepData>[] = [
  {
    id: '1',
    type: 'motifStep',
    data: {
      label: 'Input Step',
      inputSchema: 'z.void()',
      outputSchema: 'z.string()',
      status: 'idle',
    },
    position: { x: 250, y: 0 },
  },
  {
    id: '2',
    type: 'motifStep',
    data: {
      label: 'Validate',
      inputSchema: 'z.string()',
      outputSchema: 'z.string().email()',
      status: 'idle',
    },
    position: { x: 100, y: 200 },
  },
  {
    id: '3',
    type: 'motifStep',
    data: {
      label: 'Enrich',
      inputSchema: 'z.string()',
      outputSchema: 'UserProfile',
      hasStore: true,
      status: 'idle',
    },
    position: { x: 400, y: 200 },
  },
  {
    id: '4',
    type: 'motifStep',
    data: {
      label: 'Success',
      inputSchema: 'UserProfile',
      outputSchema: 'z.void()',
      status: 'idle',
    },
    position: { x: 250, y: 400 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#333' } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#333' } },
  { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#333' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#333' } },
];

export default function InteractiveHero() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);

  const updateNodeStatus = (id: string, status: MotifStepData['status']) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, status } };
        }
        return node;
      }),
    );
  };

  const runSimulation = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);

    // Reset
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: 'idle' } })));

    const sequence = ['1', '3', '4']; // Simulate one path

    for (const id of sequence) {
      // Transition In
      updateNodeStatus(id, 'transitionIn');
      await new Promise((r) => setTimeout(r, 800));

      // Ready
      updateNodeStatus(id, 'ready');
      await new Promise((r) => setTimeout(r, 1000));

      // Transition Out
      updateNodeStatus(id, 'transitionOut');
      await new Promise((r) => setTimeout(r, 500));

      // Idle (moved to next)
      updateNodeStatus(id, 'idle');
    }

    setIsRunning(false);
  }, [isRunning, setNodes]);

  return (
    <section className="relative h-[90vh] w-full overflow-hidden flex flex-col items-center justify-center pt-20">
      {/* Background Grid */}
      <div className="absolute inset-0 grid-bg z-0 pointer-events-none" />

      <div className="z-10 text-center mb-10 max-w-3xl px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
        >
          Workflow Orchestration <br />
          <span className="text-gradient">Reimagined</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl text-gray-400 mb-8"
        >
          Dead simple. Fully typed. Effortlessly orchestrated. Build complex workflows with confidence and ease.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex gap-4 justify-center"
        >
          <button className="glass-button px-8 py-3 rounded-full font-semibold text-white flex items-center gap-2 group">
            Get Started <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={runSimulation}
            className="glass-button px-8 py-3 rounded-full font-semibold text-white flex items-center gap-2"
          >
            <Play className={`w-4 h-4 ${isRunning ? 'text-green-400' : ''}`} />
            {isRunning ? 'Running...' : 'Run Demo'}
          </button>
        </motion.div>
      </div>

      {/* Interactive Graph Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="w-full max-w-5xl h-[500px] glass-panel rounded-xl overflow-hidden relative border border-gray-800 shadow-2xl"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#333" gap={20} size={1} />
          <Controls className="bg-gray-900 border-gray-800 fill-white" />
        </ReactFlow>

        {/* Overlay Badge */}
        <div className="absolute top-4 right-4 glass-button px-3 py-1 rounded-full text-xs text-gray-400 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          {isRunning ? 'Simulating Lifecycle...' : 'Idle'}
        </div>
      </motion.div>
    </section>
  );
}
