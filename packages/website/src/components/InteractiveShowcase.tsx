'use client';

import { conditionalEdge, step, workflow } from '@motif-ts/core';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Code, Play, Plus, Split } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

// Define Step Creators
const ValidateStep = step(
  {
    kind: 'validate',
    inputSchema: z.any(),
    outputSchema: z.object({ email: z.string().email(), isValid: z.boolean() }),
  },
  ({ next, transitionIn, transitionOut }) => {
    transitionIn(() => {
      // console.log('Validate: Transition In');
      return () => {};
    });
    return {
      go: (input: any) => {
        const email = input?.email || '';
        const isValid = email.includes('@');
        next({ email, isValid });
      },
    };
  },
);

const TransformStep = step(
  {
    kind: 'transform',
    inputSchema: z.object({ email: z.string(), isValid: z.boolean() }),
    outputSchema: z.object({ email: z.string(), timestamp: z.number() }),
  },
  ({ next, input }) => {
    return {
      go: () => {
        next({ email: input.email, timestamp: Date.now() });
      },
    };
  },
);

const SaveStep = step(
  { kind: 'save', inputSchema: z.object({ email: z.string(), timestamp: z.number() }) },
  ({ next, input }) => {
    return {
      go: async () => {
        // Simulate async DB call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        next();
      },
    };
  },
);

const STEPS_INFO = [
  { id: 'validate', label: 'Validate Input', code: 'z.string().email()', input: 'any', output: '{ email, isValid }' },
  {
    id: 'transform',
    label: 'Transform Data',
    code: '(data) => ({ ...data, timestamp: Date.now() })',
    input: '{ email, isValid }',
    output: '{ email, timestamp }',
  },
  {
    id: 'save',
    label: 'Save to DB',
    code: 'async (data) => await db.users.create(data)',
    input: '{ email, timestamp }',
    output: 'void',
  },
];

export default function InteractiveShowcase() {
  const [activeSteps, setActiveSteps] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [useConditional, setUseConditional] = useState(false);
  const [currentData, setCurrentData] = useState<any>(null);

  const addStep = (stepId: string) => {
    if (!activeSteps.includes(stepId)) {
      setActiveSteps([...activeSteps, stepId]);
    }
  };

  const runWorkflow = async () => {
    setIsRunning(true);
    setLogs([]);
    setCurrentData(null);

    try {
      // 1. Create Inventory
      const inventory = [ValidateStep, TransformStep, SaveStep];
      const orchestrator = workflow(inventory);

      // 2. Instantiate Steps
      const stepInstances: any[] = [];
      const instanceMap = new Map<string, any>();

      activeSteps.forEach((id) => {
        let instance;
        if (id === 'validate') instance = ValidateStep();
        else if (id === 'transform') instance = TransformStep();
        else if (id === 'save') instance = SaveStep();

        if (instance) {
          stepInstances.push(instance);
          instanceMap.set(id, instance);
        }
      });

      // 3. Register
      orchestrator.register(stepInstances);

      // 4. Connect
      for (let i = 0; i < activeSteps.length - 1; i++) {
        const currentId = activeSteps[i];
        const nextId = activeSteps[i + 1];
        const current = instanceMap.get(currentId);
        const next = instanceMap.get(nextId);

        if (useConditional && currentId === 'validate') {
          // Conditional Edge: Only proceed if isValid is true
          // For demo purposes, we'll randomly fail validation in the input
          orchestrator.connect(conditionalEdge(current, next, 'out.isValid'));
        } else {
          orchestrator.connect(current, next);
        }
      }

      // 5. Subscribe to Events
      const unsub = orchestrator.subscribe((currentStep, isWorkflowRunning) => {
        const { kind, name, status } = currentStep;
        setLogs((prev) => [...prev, `[${kind}] ${status}`]);

        if (status === 'ready') {
          // Log transition
        }
      });

      // 6. Start
      const firstStepId = activeSteps[0];
      if (firstStepId) {
        const firstInstance = instanceMap.get(firstStepId);

        // Mock Input Data
        const mockInput = { email: Math.random() > 0.5 ? 'test@example.com' : 'invalid-email' };
        if (!useConditional) mockInput.email = 'test@example.com'; // Always valid if no conditional check

        setCurrentData(mockInput);
        setLogs((prev) => [...prev, `Starting with input: ${JSON.stringify(mockInput)}`]);

        orchestrator.start(firstInstance);

        // Manually trigger the chain
        if (firstStepId === 'validate') {
          firstInstance.state.go(mockInput);
        } else if (firstStepId === 'transform') {
          firstInstance.state.go();
        } else if (firstStepId === 'save') {
          firstInstance.state.go();
        }
      }

      // Wait a bit for async operations (SaveStep)
      await new Promise((r) => setTimeout(r, 2000));

      unsub();
      setIsRunning(false);
      setLogs((prev) => [...prev, 'Workflow Execution Finished']);
    } catch (err: any) {
      setLogs((prev) => [...prev, `Error: ${err.message}`]);
      setIsRunning(false);
    }
  };

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Build in Seconds</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Compose workflows visually or with code. motif-ts keeps them in sync. Try adding steps below to generate the
          workflow code.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Visual Builder */}
        <div className="glass-panel rounded-2xl p-8 border border-gray-800 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              Visual Builder
            </h3>
            <div className="flex gap-2">
              {STEPS_INFO.map((step) => (
                <button
                  key={step.id}
                  onClick={() => addStep(step.id)}
                  disabled={activeSteps.includes(step.id)}
                  className={`px-3 py-1 rounded-full text-sm border transition-all ${
                    activeSteps.includes(step.id)
                      ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500/10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20'
                  }`}
                >
                  + {step.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 flex-1 min-h-[300px]">
            <AnimatePresence>
              {activeSteps.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl p-10"
                >
                  Select steps above to build your workflow
                </motion.div>
              )}
              {activeSteps.map((stepId, index) => (
                <div key={stepId}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="glass-button p-4 rounded-xl flex items-center justify-between group border-l-4 border-l-blue-500"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-mono text-gray-400">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-200">
                          {STEPS_INFO.find((s) => s.id === stepId)?.label}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-1">
                          In: <span className="text-blue-400">{STEPS_INFO.find((s) => s.id === stepId)?.input}</span> →
                          Out: <span className="text-green-400">{STEPS_INFO.find((s) => s.id === stepId)?.output}</span>
                        </div>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>

                  {/* Edge Visualization */}
                  {index < activeSteps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowRight className="w-5 h-5 text-gray-600 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-6 flex justify-between items-center pt-6 border-t border-gray-800">
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
                activeSteps.length === 0
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Running...' : 'Run Workflow'}
            </button>
          </div>
        </div>

        {/* Code Preview */}
        <div className="glass-panel rounded-2xl p-8 border border-gray-800 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Code className="w-32 h-32" />
          </div>

          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            Generated Code
          </h3>

          <div className="font-mono text-sm text-gray-300 overflow-x-auto flex-1">
            <pre className="language-typescript">
              <code>
                {`import { workflow, step${useConditional ? ', conditionalEdge' : ''} } from '@motif-ts/core';
import { z } from 'zod';

const myWorkflow = new workflow([
${activeSteps
  .map(
    (id) => `  // ${STEPS_INFO.find((s) => s.id === id)?.label}
  step({
    kind: '${id}',
    inputSchema: z.${STEPS_INFO.find((s) => s.id === id)?.input === 'unknown' ? 'any' : 'object({...})'},
    handler: ${STEPS_INFO.find((s) => s.id === id)?.code}
  }),`,
  )
  .join('\n')}
]);

// Connect steps
${activeSteps
  .map((id, i) => {
    if (i === activeSteps.length - 1) return '';
    const nextId = activeSteps[i + 1];
    if (useConditional && i === 0) {
      return `myWorkflow.connect(
  conditionalEdge(${id}, ${nextId}, (out) => out.isValid)
);`;
    }
    return `myWorkflow.connect(${id}, ${nextId});`;
  })
  .join('\n')}

// Ready to execute
myWorkflow.start();`}
              </code>
            </pre>
          </div>

          {/* Console Output Overlay */}
          <AnimatePresence>
            {logs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 left-4 right-4 bg-black/90 backdrop-blur-md rounded-lg p-4 border border-gray-700 font-mono text-xs text-green-400 max-h-[200px] overflow-y-auto shadow-2xl"
              >
                <div className="text-gray-500 mb-2 border-b border-gray-800 pb-1 flex justify-between">
                  <span>Console Output</span>
                  {currentData && (
                    <span className="text-blue-400">Data: {JSON.stringify(currentData).slice(0, 30)}...</span>
                  )}
                </div>
                {logs.map((log, i) => (
                  <div key={i} className="mb-1 border-l-2 border-gray-800 pl-2 hover:bg-gray-900/50">
                    <span className="text-gray-600 mr-2">{new Date().toLocaleTimeString().split(' ')[0]}</span>
                    {'>'} {log}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
