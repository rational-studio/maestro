import { assert, describe, expect, it } from 'vitest';
import z from 'zod/v4';

import { step, workflow } from '../src';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Async TransitionHook support', () => {
  it('handles basic async cleanup on transitionIn', async () => {
    let inCleanupCount = 0;

    const A = step({ kind: 'A', outputSchema: z.number() }, ({ transitionIn, next }) => {
      transitionIn(async () => {
        await delay(10);
        return () => {
          inCleanupCount += 1;
        };
      });
      return { go: () => next(1) };
    });

    const B = step({ kind: 'B', inputSchema: z.number(), outputSchema: z.number() }, ({ input }) => ({
      echo: () => input,
    }));

    const o = workflow([A, B]);
    const a = A('a');
    const b = B('b');
    o.register([a, b]);
    o.connect(a, b);

    o.start(a);
    const s = o.getCurrentStep();
    assert(s.status === 'ready' && s.kind === 'A');
    s.state.go();

    // Cleanup may run either during exit if resolved, or immediately upon resolve post-exit
    await delay(20);
    expect(inCleanupCount).toBe(1);
  });

  it('swallows rejected async hooks with error handling', async () => {
    const errors: string[] = [];
    const originalWarn = console.warn;
    console.warn = (msg: unknown) => {
      errors.push(String(msg));
    };

    const A = step({ kind: 'A', outputSchema: z.number() }, ({ transitionIn, next }) => {
      transitionIn(async () => {
        await delay(5);
        throw new Error('boom');
      });
      return { go: () => next(1) };
    });
    const B = step({ kind: 'B', inputSchema: z.number(), outputSchema: z.number() }, ({ input }) => ({
      echo: () => input,
    }));

    const o = workflow([A, B]);
    const a = A('a');
    const b = B('b');
    o.register([a, b]);
    o.connect(a, b);
    o.start(a);
    const s = o.getCurrentStep();
    assert(s.status === 'ready' && s.kind === 'A');
    s.state.go();

    await delay(20);
    // Ensure an error was logged but flow continued
    expect(errors.some((e) => e.includes('transitionIn'))).toBe(true);
    console.warn = originalWarn;
  });

  it('supports mixed synchronous and asynchronous hooks', async () => {
    let inCleanupCount = 0;
    let outCleanupCount = 0;

    const A = step({ kind: 'A', outputSchema: z.number() }, ({ transitionIn, transitionOut, next }) => {
      transitionIn(() => {
        return () => {
          inCleanupCount += 1;
        };
      });
      transitionIn(async () => {
        await delay(5);
        return () => {
          inCleanupCount += 1;
        };
      });
      transitionOut(async () => {
        await delay(5);
        return () => {
          outCleanupCount += 1;
        };
      });
      return { go: () => next(42) };
    });

    const B = step({ kind: 'B', inputSchema: z.number(), outputSchema: z.number() }, ({ input }) => ({
      echo: () => input,
    }));

    const o = workflow([A, B]);
    const a = A('a');
    const b = B('b');
    o.register([a, b]);
    o.connect(a, b);

    o.start(a);
    const s = o.getCurrentStep();
    assert(s.status === 'ready' && s.kind === 'A');
    s.state.go();

    await delay(20);
    expect(inCleanupCount).toBe(2);
    // transitionOut cleanup runs when navigating back into A
    o.back();
    await delay(20);
    expect(outCleanupCount).toBe(1);
  });

  it('executes out cleanups even if they resolve after back (concurrency)', async () => {
    let outCleanupCount = 0;

    const A = step({ kind: 'A', outputSchema: z.string() }, ({ transitionOut, next }) => {
      transitionOut(async () => {
        await delay(30); // resolve after we already backed in
        return () => {
          outCleanupCount += 1;
        };
      });
      return { go: () => next('go') };
    });

    const B = step({ kind: 'B', inputSchema: z.string(), outputSchema: z.string() }, ({ input }) => ({
      val: () => input,
    }));

    const o = workflow([A, B]);
    const a = A('a');
    const b = B('b');
    o.register([a, b]);
    o.connect(a, b);

    o.start(a);
    const s = o.getCurrentStep();
    assert(s.status === 'ready' && s.kind === 'A');
    s.state.go();

    // Now back into A before the async out cleanup resolves
    o.back();
    // Give resolution time; cleanup should still run once resolved
    await delay(50);
    expect(outCleanupCount).toBe(1);
  });

  it('prevents memory leaks and duplicate cleanup executions', async () => {
    let executions = 0;

    const A = step({ kind: 'A', outputSchema: z.number() }, ({ transitionOut, next }) => {
      transitionOut(async () => {
        // Simulate resource that must be cleaned
        const interval = setInterval(() => {}, 5);
        await delay(20);
        return () => {
          clearInterval(interval);
          executions += 1;
        };
      });
      return { go: () => next(1) };
    });

    const B = step({ kind: 'B', inputSchema: z.number(), outputSchema: z.number() }, ({ input }) => ({
      echo: () => input,
    }));

    const o = workflow([A, B]);
    const a = A('a');
    const b = B('b');
    o.register([a, b]);
    o.connect(a, b);

    o.start(a);
    const s = o.getCurrentStep();
    assert(s.status === 'ready' && s.kind === 'A');
    s.state.go();

    // Back before async cleanup resolves; it must still run exactly once
    o.back();
    await delay(50);
    expect(executions).toBe(1);
  });
});
