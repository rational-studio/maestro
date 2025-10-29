import { describe, it } from 'vitest';
import z from 'zod';

import { step, workflow } from '../src';

// Use global performance if available; fall back to Date.now for portability
const perf = globalThis.performance ?? { now: Date.now };

function noop() {}

describe('Performance: sync vs async TransitionHook', () => {
  it('benchmarks transitionIn with 1000 hooks (sync vs async)', async () => {
    const N = 1000;

    const SyncStep = step({ kind: 'SyncStep', outputSchema: z.number() }, ({ transitionIn, next }) => {
      for (let i = 0; i < N; i++) {
        transitionIn(() => noop);
      }
      return { go: () => next(1) };
    });

    const AsyncStep = step({ kind: 'AsyncStep', outputSchema: z.number() }, ({ transitionIn, next }) => {
      for (let i = 0; i < N; i++) {
        transitionIn(async () => Promise.resolve(noop));
      }
      return { go: () => next(1) };
    });

    const Terminal = step({ kind: 'Terminal', inputSchema: z.number(), outputSchema: z.number() }, ({ input }) => ({
      done: () => input,
    }));

    // Sync path
    const o1 = workflow([SyncStep, Terminal]);
    const s1 = SyncStep('s1');
    const t1 = Terminal('t1');
    o1.register([s1, t1]);
    o1.connect(s1, t1);
    const startSync = perf.now();
    o1.start(s1);
    const endSync = perf.now();

    // Async path
    const o2 = workflow([AsyncStep, Terminal]);
    const s2 = AsyncStep('s2');
    const t2 = Terminal('t2');
    o2.register([s2, t2]);
    o2.connect(s2, t2);
    const startAsync = perf.now();
    o2.start(s2);
    // Allow microtasks to settle
    await Promise.resolve();
    await Promise.resolve();
    const endAsync = perf.now();

    // eslint-disable-next-line no-console
    console.log(
      `[bench] TransitionIn hooks: sync=${(endSync - startSync).toFixed(2)}ms, async=${(endAsync - startAsync).toFixed(
        2,
      )}ms (N=${N})`,
    );
  });
});
