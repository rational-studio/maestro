'use client';

import { step, workflow } from '@motif-ts/core';
import { devtools, persist } from '@motif-ts/middleware';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { z } from 'zod';

const WorkflowGraph = dynamic(() => import('./WorkflowGraph'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] rounded-md border border-black/10 p-6 text-sm text-black/60 dark:border-white/15 dark:text-white/60">
      Loading interactive graph…
    </div>
  ),
});

const TimeTravelDebugger = dynamic(() => import('./TimeTravelDebugger'), {
  ssr: false,
  loading: () => (
    <div className="rounded-md border border-black/10 p-4 text-sm text-black/60 dark:border-white/15 dark:text-white/60">
      Loading debugger…
    </div>
  ),
});

export default function WorkflowShowcase() {
  const wf = useMemo(() => {
    const Input = step({ kind: 'Input', outputSchema: z.object({ name: z.string() }) }, ({ next }) => ({
      submit(name: string) {
        next({ name });
      },
    }));
    const Greet = step(
      {
        kind: 'Greet',
        inputSchema: z.object({ name: z.string() }),
        outputSchema: z.object({ message: z.string() }),
      },
      ({ input, next }) => {
        const message = 'Hello ' + input.name;
        return {
          message,
          finish() {
            next({ message });
          },
        };
      },
    );
    const Done = step({ kind: 'Done', inputSchema: z.object({ message: z.string() }) }, ({ input }) => ({
      result: input,
    }));
    const o = workflow([Input, Greet, Done]);
    const input = Input('Input');
    const greet = Greet('Greet');
    const done = Done('Done');
    const base = o.register([input, greet, done]).connect(input, greet).connect(greet, done).start(input);
    return persist(devtools(base));
  }, []);
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5" aria-labelledby="interactive-demo-title">
      <div className="lg:col-span-3">
        <h3 id="interactive-demo-title" className="text-lg font-medium">
          Interactive Workflow Demo
        </h3>
        <p className="mt-2 text-black/70 dark:text-white/70">
          Visualize a real motif-ts workflow and its typed transitions. Use the debugger to snapshot and replay state,
          and connect Redux DevTools for time travel.
        </p>
        <div className="mt-4">
          <WorkflowGraph workflow={wf} />
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h4 className="text-base font-semibold">Time Travel Debugger</h4>
          <p className="mt-2 text-sm text-black/70 dark:text-white/70">
            Capture snapshots with persist middleware and replay them to verify transitions and behavior.
          </p>
          <div className="mt-4">
            <TimeTravelDebugger workflow={wf} />
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h4 className="text-base font-semibold">Performance Benchmarks</h4>
          <p className="mt-2 text-sm text-black/70 dark:text-white/70">
            Benchmarks for the expression engine and orchestrator are maintained in the repository. Results will be
            published in documentation.
          </p>
          <a
            href="https://github.com/rational-studio/motif-ts/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-black/10 px-3 text-xs font-medium text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            aria-label="View benchmark progress on GitHub"
          >
            Track on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
