import { assert, describe, expect, it } from 'vitest';
import z from 'zod';

import { step, transformEdge, workflow } from '../../src';

describe('TransformEdge: converts A output to B input type', () => {
  it('supports inline converter and registered converter', () => {
    const A = step({ kind: 'A', outputSchema: z.object({ name: z.string(), age: z.number() }) }, ({ next }) => ({
      go: (n: string, a: number) => next({ name: n, age: a }),
    }));
    const B = step(
      { kind: 'B', inputSchema: z.object({ username: z.string(), years: z.number() }), outputSchema: z.void() },
      ({ input }) => ({ who: () => input.username + ':' + input.years }),
    );

    const orchestrator = workflow([A, B]);
    const a = A();
    const b = B();
    orchestrator.register([a, b]);

    // Inline converter via expression
    orchestrator.connect(transformEdge(a, b, '{ username: out.name, years: out.age }'));
    orchestrator.start(a);
    const sA1 = orchestrator.getCurrentStep();
    assert(sA1.status === 'ready' && sA1.kind === 'A');
    sA1.state.go('alice', 20);

    const sB1 = orchestrator.getCurrentStep();
    assert(sB1.status === 'ready' && sB1.kind === 'B');
    expect(sB1.state.who()).toBe('alice:20');
  });

  it('throws clear error when converter fails', () => {
    const A = step({ kind: 'A', outputSchema: z.object({ name: z.string(), age: z.number() }) }, ({ next }) => ({
      go: (n: string, a: number) => next({ name: n, age: a }),
    }));
    const B = step(
      { kind: 'B', inputSchema: z.object({ username: z.string(), years: z.number() }), outputSchema: z.void() },
      () => ({}),
    );

    const orchestrator = workflow([A, B]);
    const a = A();
    const b = B();
    orchestrator.register([a, b]);
    // Expression that results in undefined triggers transform error
    orchestrator.connect(transformEdge(a, b, 'undefined'));

    orchestrator.start(a);
    const sA = orchestrator.getCurrentStep();
    assert(sA.status === 'ready' && sA.kind === 'A');
    expect(() => sA.state.go('alice', 20)).toThrow(
      'TransformEdge: failed to convert output -> input. Reason: result is undefined',
    );
  });
});
