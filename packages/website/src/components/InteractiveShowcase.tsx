'use client';

import { conditionalEdge, step, workflow, type CurrentStep, type WorkflowAPI } from '@motif-ts/core';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Code,
  CreditCard,
  Loader2,
  Mail,
  Play,
  RotateCcw,
  Smartphone,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, Edge, MarkerType, Node, useEdgesState, useNodesState } from 'reactflow';
import { createHighlighter, type Highlighter } from 'shiki';

import 'reactflow/dist/style.css';

import { z } from 'zod';

import MotifStepNode, { MotifStepData } from './MotifStepNode';

const nodeTypes = {
  motifStep: MotifStepNode,
};

// --- Step Definitions ---

const InputStep = step(
  {
    kind: 'input',
    outputSchema: z.object({ email: z.string().email() }).passthrough(),
  },
  ({ next, transitionIn }) => {
    transitionIn(() => () => {});
    return {
      submit: (email: string) => {
        next({ email });
      },
    };
  },
);

const VerifyStep = step(
  {
    kind: 'verify',
    inputSchema: z.object({ email: z.string() }).passthrough(),
    outputSchema: z.object({ email: z.string(), isVerified: z.boolean() }).passthrough(),
  },
  ({ next, input }) => {
    return {
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API
        next({ ...input, isVerified: true });
      },
    };
  },
);

const ProfileStep = step(
  {
    kind: 'profile',
    inputSchema: z.object({ email: z.string() }).passthrough(),
    outputSchema: z.object({ email: z.string(), name: z.string(), role: z.string() }).passthrough(),
  },
  ({ next, input }) => {
    return {
      submitProfile: (name: string, role: string) => {
        next({ ...input, name, role });
      },
    };
  },
);

const PlanStep = step(
  {
    kind: 'plan',
    inputSchema: z.object({ email: z.string() }).passthrough(),
    outputSchema: z.object({ email: z.string(), plan: z.string() }).passthrough(),
  },
  ({ next, input }) => {
    return {
      selectPlan: (plan: string) => {
        next({ ...input, plan });
      },
    };
  },
);

const SuccessStep = step(
  {
    kind: 'success',
    inputSchema: z.object({ email: z.string() }).passthrough(),
  },
  ({ input }) => {
    return {
      data: input,
    };
  },
);

const STEPS_INFO = [
  {
    id: 'input',
    label: 'User Input',
    code: '({ next }) => ({ submit: (email) => next({ email }) })',
    input: 'void',
    output: '{ email }',
  },
  {
    id: 'verify',
    label: 'Verify Email',
    code: 'async ({ next }) => { await api.check(); next({ ...input, isVerified: true }) }',
    input: '{ email }',
    output: '{ email, isVerified }',
  },
  {
    id: 'profile',
    label: 'Profile',
    code: '({ next, input }) => ({ submit: (name, role) => next({ ...input, name, role }) })',
    input: '{ email }',
    output: '{ email, name, role }',
  },
  {
    id: 'plan',
    label: 'Select Plan',
    code: '({ next, input }) => ({ select: (plan) => next({ ...input, plan }) })',
    input: '{ email }',
    output: '{ email, plan }',
  },
  {
    id: 'success',
    label: 'Success',
    code: '({ input }) => <SuccessUI data={input} />',
    input: '{ ...data }',
    output: 'void',
  },
];

// --- Shiki Hook ---
const useShiki = (code: string) => {
  const [html, setHtml] = useState<string | null>(null);
  const highlighterRef = useRef<Highlighter | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!highlighterRef.current) {
        highlighterRef.current = await createHighlighter({
          themes: ['github-dark-high-contrast'],
          langs: ['typescript'],
        });
      }

      if (mounted && highlighterRef.current) {
        const highlighted = highlighterRef.current.codeToHtml(code, {
          lang: 'typescript',
          theme: 'github-dark-high-contrast',
        });
        setHtml(highlighted);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [code]);

  return html;
};

const CodeBlock = ({ code }: { code: string }) => {
  const html = useShiki(code);

  if (!html) {
    return <div className="font-mono text-sm leading-relaxed whitespace-pre text-gray-300">{code}</div>;
  }

  return (
    <div
      className="font-mono text-sm leading-relaxed whitespace-pre [&>pre]:!bg-transparent [&>pre]:!p-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default function InteractiveShowcase() {
  const [activeSteps, setActiveSteps] = useState<string[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [useConditional, setUseConditional] = useState(false);
  const [errorShake, setErrorShake] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Execution State
  const [currentStepKind, setCurrentStepKind] = useState<string | null>(null);
  const orchestratorRef = useRef<WorkflowAPI<any> | null>(null);

  const isValidConnection = (prevId: string, nextId: string) => {
    // Input must be first
    if (prevId === 'input') return nextId !== 'input';

    // Success must be last (nothing connects FROM success)
    if (prevId === 'success') return false;

    // Can't connect to Input (except as first, handled above)
    if (nextId === 'input') return false;

    // Prevent self-loops for simplicity in this demo
    if (prevId === nextId) return false;

    return true;
  };

  const addStep = (stepId: string) => {
    if (activeSteps.includes(stepId)) return;

    // Check validity with previous step
    if (activeSteps.length > 0) {
      const prevStepId = activeSteps[activeSteps.length - 1];
      if (!isValidConnection(prevStepId, stepId)) {
        setErrorShake(stepId);
        setTimeout(() => setErrorShake(null), 500);
        return;
      }
    } else {
      // First step MUST be input
      if (stepId !== 'input') {
        setErrorShake(stepId);
        setTimeout(() => setErrorShake(null), 500);
        return;
      }
    }

    const newActiveSteps = [...activeSteps, stepId];
    setActiveSteps(newActiveSteps);

    const stepInfo = STEPS_INFO.find((s) => s.id === stepId)!;
    const newNode: Node<MotifStepData> = {
      id: stepId,
      type: 'motifStep',
      data: {
        label: stepInfo.label,
        inputSchema: stepInfo.input,
        outputSchema: stepInfo.output,
        status: 'idle',
      },
      position: { x: 250, y: newActiveSteps.length * 150 },
    };

    setNodes((nds) => [...nds, newNode]);

    if (newActiveSteps.length > 1) {
      const prevStepId = newActiveSteps[newActiveSteps.length - 2];
      const newEdge: Edge = {
        id: `e${prevStepId}-${stepId}`,
        source: prevStepId,
        target: stepId,
        animated: true,
        style: { stroke: '#333' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#333' },
      };

      if (useConditional && prevStepId === 'input' && stepId === 'verify') {
        newEdge.label = 'valid?';
        newEdge.style = { stroke: '#eab308' };
        newEdge.markerEnd = { type: MarkerType.ArrowClosed, color: '#eab308' };
      }

      setEdges((eds) => [...eds, newEdge]);
    }
  };

  const resetBuilder = () => {
    setActiveSteps([]);
    setNodes([]);
    setEdges([]);
    setIsRunning(false);
    setCurrentStepKind(null);
    setCanGoBack(false);
    if (orchestratorRef.current) {
      orchestratorRef.current.stop();
      orchestratorRef.current = null;
    }
  };

  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.source === 'input' && edge.target === 'verify') {
          return {
            ...edge,
            label: useConditional ? 'valid?' : undefined,
            style: { stroke: useConditional ? '#eab308' : '#333' },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: useConditional ? '#eab308' : '#333',
            },
          };
        }
        return edge;
      }),
    );
  }, [useConditional, setEdges]);

  const runWorkflow = async () => {
    setIsRunning(true);
    setCurrentStepKind(null);
    setCanGoBack(false);

    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: 'idle' } })));

    try {
      const inventory = [InputStep, VerifyStep, ProfileStep, PlanStep, SuccessStep];
      const orchestrator = workflow(inventory);
      orchestratorRef.current = orchestrator;

      // Create instances
      const stepInstances: any[] = [];
      const instanceMap = new Map<string, any>();

      activeSteps.forEach((id) => {
        let instance;
        if (id === 'input') instance = InputStep();
        else if (id === 'verify') instance = VerifyStep();
        else if (id === 'profile') instance = ProfileStep();
        else if (id === 'plan') instance = PlanStep();
        else if (id === 'success') instance = SuccessStep();

        if (instance) {
          stepInstances.push(instance);
          instanceMap.set(id, instance);
        }
      });

      orchestrator.register(stepInstances);

      for (let i = 0; i < activeSteps.length - 1; i++) {
        const currentId = activeSteps[i];
        const nextId = activeSteps[i + 1];
        const current = instanceMap.get(currentId);
        const next = instanceMap.get(nextId);

        if (useConditional && currentId === 'input') {
          orchestrator.connect(conditionalEdge(current, next, 'true'));
        } else {
          orchestrator.connect(current, next);
        }
      }

      const unsub = orchestrator.subscribe((currentStep: CurrentStep<any>) => {
        const { kind, status, state } = currentStep;

        // Update canGoBack state
        setCanGoBack(orchestrator.$$INTERNAL.history.length > 0);

        if (status === 'transitionIn' || status === 'ready' || status === 'transitionOut') {
          // Update status for the current node, and reset others to idle
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === kind) {
                return { ...node, data: { ...node.data, status } };
              }
              // If it's not the current node, ensure it's idle
              return { ...node, data: { ...node.data, status: 'idle' } };
            }),
          );
        }

        if (status === 'ready') {
          setCurrentStepKind(kind);

          // Auto-run verify step
          if (kind === 'verify') {
            // Access the state from the currentStep object, NOT the instance definition
            (state as any).execute().catch((err: any) => {
              if (err.message && err.message.includes('No next step')) {
                handleRestart();
              } else {
                console.error(err);
              }
            });
          }
        }
      });

      const firstStepId = activeSteps[0];
      if (firstStepId) {
        const firstInstance = instanceMap.get(firstStepId);
        orchestrator.start(firstInstance);
      }

      return unsub;
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('No next step')) {
        handleRestart();
      } else {
        setIsRunning(false);
      }
    }
  };

  // UI Actions
  const handleInputSubmit = (email: string) => {
    if (orchestratorRef.current) {
      const currentStep = orchestratorRef.current.getCurrentStep();
      if (currentStep && currentStep.kind === 'input') {
        try {
          (currentStep.state as any).submit(email);
        } catch (err: any) {
          if (err.message && err.message.includes('No next step')) {
            handleRestart();
          } else {
            console.error(err);
          }
        }
      }
    }
  };

  const handleProfileSubmit = (name: string, role: string) => {
    if (orchestratorRef.current) {
      const currentStep = orchestratorRef.current.getCurrentStep();
      if (currentStep && currentStep.kind === 'profile') {
        try {
          (currentStep.state as any).submitProfile(name, role);
        } catch (err: any) {
          if (err.message && err.message.includes('No next step')) {
            handleRestart();
          } else {
            console.error(err);
          }
        }
      }
    }
  };

  const handlePlanSelect = (plan: string) => {
    if (orchestratorRef.current) {
      const currentStep = orchestratorRef.current.getCurrentStep();
      if (currentStep && currentStep.kind === 'plan') {
        try {
          (currentStep.state as any).selectPlan(plan);
        } catch (err: any) {
          if (err.message && err.message.includes('No next step')) {
            handleRestart();
          } else {
            console.error(err);
          }
        }
      }
    }
  };

  const handleBack = () => {
    if (orchestratorRef.current) {
      try {
        orchestratorRef.current.back();
      } catch (err) {
        console.error('Back navigation failed:', err);
      }
    }
  };

  const handleRestart = () => {
    setIsRunning(false);
    setCurrentStepKind(null);
    setCanGoBack(false);
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: 'idle' } })));
    if (orchestratorRef.current) {
      orchestratorRef.current.stop();
      orchestratorRef.current = null;
    }
  };

  function captialize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const generateCode = () => {
    const stepDefs = activeSteps.map((id) => `const ${captialize(id)} = step({ kind: '${id}' }, ...);`).join('\n');
    const creations = activeSteps.map((id) => `const ${id} = ${captialize(id)}();`).join('\n');
    const registrations = `flow.register([${activeSteps.join(', ')}])`;
    const connections = activeSteps
      .slice(0, -1)
      .map((id, i) => {
        const nextId = activeSteps[i + 1];
        if (useConditional && id === 'input' && nextId === 'verify') {
          return `    .connect(conditionalEdge(${id}, ${nextId}, 'true'))`;
        }
        return `    .connect(${id}, ${nextId})`;
      })
      .join('\n');

    return `import { workflow, step, conditionalEdge } from '@motif-ts/core';

// Your Workflow Definition
${stepDefs}

${creations}

const flow = workflow([${activeSteps.map((id) => captialize(id)).join(', ')}]);

${registrations}
${connections}
    .start();`;
  };

  return (
    <section className="py-24 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Build in Seconds
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Compose workflows visually or with code. motif-ts keeps them in sync.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 h-[750px]">
          {/* Visual Builder */}
          <div className="glass-panel rounded-2xl border border-gray-800 flex flex-col overflow-hidden relative">
            <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap">
              {STEPS_INFO.map((step) => (
                <motion.button
                  key={step.id}
                  onClick={() => addStep(step.id)}
                  disabled={activeSteps.includes(step.id)}
                  animate={errorShake === step.id ? { x: [0, -8, 8, -8, 8, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className={`px-3 py-1 rounded-full text-sm border transition-all backdrop-blur-md ${
                    errorShake === step.id
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : activeSteps.includes(step.id)
                        ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500/10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20'
                  }`}
                >
                  + {step.label}
                </motion.button>
              ))}
              {activeSteps.length > 0 && (
                <button
                  onClick={resetBuilder}
                  className="p-1.5 rounded-full bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20 transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex-1 bg-[#0a0c10] relative">
              {activeSteps.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 pointer-events-none">
                  <p>Add steps to start building...</p>
                </div>
              )}
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#333" gap={20} size={1} />
              </ReactFlow>
            </div>

            <div className="p-4 border-t border-gray-800 bg-black/40 backdrop-blur-md flex justify-between items-center z-10">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={useConditional}
                  onChange={(e) => setUseConditional(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500"
                />
                Use Conditional Edge
              </label>

              <button
                onClick={runWorkflow}
                disabled={activeSteps.length === 0 || isRunning}
                className={`px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  activeSteps.length === 0 || isRunning
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                }`}
              >
                <Play className="w-4 h-4" />
                {isRunning ? 'Running...' : 'Run Workflow'}
              </button>
            </div>
          </div>

          {/* Right Panel: Flip Card (Code vs Live Preview) */}
          <div className="relative group h-full" style={{ perspective: '1000px' }}>
            <motion.div
              className="w-full h-full relative"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateY: isRunning ? 180 : 0 }}
              transition={{
                duration: 0.6,
                type: 'spring',
                stiffness: 260,
                damping: 20,
              }}
            >
              {/* Front Face: Generated Code */}
              <div
                className="absolute inset-0 glass-panel rounded-2xl border border-gray-800 overflow-hidden flex flex-col bg-[#0a0c10]"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="px-6 py-4 border-b border-gray-800 text-gray-500 font-medium flex items-center gap-2 bg-white/5">
                  <Code className="w-4 h-4" />
                  Generated Code
                </div>
                <div className="flex-1 p-6 overflow-auto">
                  <CodeBlock code={generateCode()} />
                </div>
              </div>

              {/* Back Face: Live Preview (Mobile Simulator) */}
              <div
                className="absolute inset-0 glass-panel rounded-2xl border border-gray-800 overflow-hidden flex flex-col bg-black"
                style={{
                  transform: 'rotateY(180deg)',
                  backfaceVisibility: 'hidden',
                }}
              >
                <div className="px-6 py-4 border-b border-gray-800 text-white font-medium flex items-center justify-between bg-blue-500/10">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    Live Preview
                  </div>
                  <button
                    onClick={handleRestart}
                    className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300 transition-colors"
                  >
                    Stop & Flip Back
                  </button>
                </div>

                <div className="flex-1 relative flex items-center justify-center p-8 bg-gradient-to-br from-gray-900 to-black">
                  {/* Mobile Device Frame */}
                  <div className="relative mx-auto border-gray-800 bg-gray-900 border-[12px] rounded-[3rem] h-[630px] w-[300px] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5">
                    {/* Status Bar */}
                    <div className="h-12 w-full flex justify-between items-center px-6 text-[10px] text-white pt-4 z-10">
                      <span className="font-medium pl-1">9:41</span>
                    </div>

                    {/* Navigation Bar */}
                    <div className="h-10 w-full flex items-center px-4 z-10 relative">
                      {canGoBack && (
                        <button
                          onClick={handleBack}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back
                        </button>
                      )}
                    </div>

                    {/* Screen Content */}
                    <div className="flex-1 bg-gray-950 relative overflow-hidden flex flex-col">
                      <AnimatePresence mode="wait">
                        {isRunning && currentStepKind === 'input' && (
                          <motion.div
                            key="input"
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            className="absolute inset-0 p-6 flex flex-col justify-center bg-gradient-to-b from-gray-900 to-black"
                          >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center mb-8 shadow-lg shadow-blue-500/20">
                              <Mail className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl text-white font-bold mb-2">Welcome Back</h2>
                            <p className="text-sm text-gray-400 mb-8">Enter your email to access your workspace.</p>

                            <form
                              className="space-y-4"
                              onSubmit={(e) => {
                                e.preventDefault();
                                // @ts-expect-error
                                handleInputSubmit(e.target.email.value);
                              }}
                            >
                              <div>
                                <label className="text-xs text-gray-500 font-medium ml-1 mb-1 block">EMAIL</label>
                                <input
                                  name="email"
                                  type="email"
                                  placeholder="name@example.com"
                                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-600"
                                  defaultValue="hello@zhongliang.wang"
                                />
                              </div>

                              <button
                                type="submit"
                                className="w-full bg-white text-black hover:bg-gray-100 rounded-xl py-3.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/5"
                              >
                                Continue <ChevronRight className="w-4 h-4" />
                              </button>
                            </form>
                          </motion.div>
                        )}

                        {isRunning && currentStepKind === 'verify' && (
                          <motion.div
                            key="verify"
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black"
                          >
                            <div className="relative">
                              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                              <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
                            </div>
                            <h3 className="text-white font-semibold mt-8 mb-2">Verifying...</h3>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Secure Connection</p>
                          </motion.div>
                        )}

                        {isRunning && currentStepKind === 'profile' && (
                          <motion.div
                            key="profile"
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            className="absolute inset-0 p-6 flex flex-col justify-center bg-gradient-to-b from-gray-900 to-black"
                          >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center mb-8 shadow-lg shadow-purple-500/20">
                              <User className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl text-white font-bold mb-2">Your Profile</h2>
                            <p className="text-sm text-gray-400 mb-8">Tell us a bit about yourself.</p>

                            <form
                              className="space-y-4"
                              onSubmit={(e) => {
                                e.preventDefault();
                                // @ts-expect-error
                                handleProfileSubmit(e.target.name.value, e.target.role.value);
                              }}
                            >
                              <div>
                                <label className="text-xs text-gray-500 font-medium ml-1 mb-1 block">NAME</label>
                                <input
                                  name="name"
                                  type="text"
                                  placeholder="John Doe"
                                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-600"
                                  defaultValue="Zhongliang Wang"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 font-medium ml-1 mb-1 block">ROLE</label>
                                <input
                                  name="role"
                                  type="text"
                                  placeholder="Developer"
                                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-600"
                                  defaultValue="Engineer"
                                />
                              </div>

                              <button
                                type="submit"
                                className="w-full bg-white text-black hover:bg-gray-100 rounded-xl py-3.5 text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/5"
                              >
                                Next <ChevronRight className="w-4 h-4" />
                              </button>
                            </form>
                          </motion.div>
                        )}

                        {isRunning && currentStepKind === 'plan' && (
                          <motion.div
                            key="plan"
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            className="absolute inset-0 p-6 flex flex-col justify-center bg-gradient-to-b from-gray-900 to-black"
                          >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-green-600 to-teal-600 flex items-center justify-center mb-8 shadow-lg shadow-green-500/20">
                              <CreditCard className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl text-white font-bold mb-2">Select Plan</h2>
                            <p className="text-sm text-gray-400 mb-8">Choose a plan that fits your needs.</p>

                            <div className="space-y-3">
                              {['Free', 'Pro', 'Team'].map((plan) => (
                                <button
                                  key={plan}
                                  onClick={() => handlePlanSelect(plan)}
                                  className="w-full bg-gray-900 border border-gray-800 hover:border-green-500/50 hover:bg-gray-800 rounded-xl p-4 text-left transition-all group"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-white font-medium">{plan}</span>
                                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-green-500 transition-colors" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {isRunning && currentStepKind === 'success' && (
                          <motion.div
                            key="success"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-green-950/30 to-black"
                          >
                            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 ring-1 ring-green-500/20">
                              <Check className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-2xl text-white font-bold mb-2">All Set!</h3>
                            <div className="text-sm text-gray-400 mb-8 space-y-1">
                              <p>
                                Welcome,{' '}
                                <span className="text-white font-medium">
                                  {orchestratorRef.current?.getCurrentStep().state.data?.name || 'User'}
                                </span>
                              </p>
                              <p>
                                Role:{' '}
                                <span className="text-white">
                                  {orchestratorRef.current?.getCurrentStep().state.data?.role || 'N/A'}
                                </span>
                              </p>
                              <p>
                                Plan:{' '}
                                <span className="text-white">
                                  {orchestratorRef.current?.getCurrentStep().state.data?.plan || 'N/A'}
                                </span>
                              </p>
                              <p className="text-xs mt-2 text-gray-500">
                                {orchestratorRef.current?.getCurrentStep().state.data?.email}
                              </p>
                            </div>

                            <button
                              onClick={handleRestart}
                              className="px-8 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white rounded-full text-sm font-medium transition-all"
                            >
                              Start Over
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Home Indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-800 rounded-full" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
