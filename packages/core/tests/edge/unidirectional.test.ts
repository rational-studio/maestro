import { assert, describe, expect, it } from 'vitest';
import z from 'zod';

import { step, workflow } from '../../src';

describe('UnidirectionalEdge: forward allowed, back blocked', () => {
  it('allows forward transition and blocks back with clear error', () => {
    const A = step({ kind: 'A', outputSchema: z.number() }, ({ next }) => ({ go: () => next(1) }));
    const B = step({ kind: 'B', inputSchema: z.number(), outputSchema: z.number() }, ({ input }) => ({
      id: () => input,
    }));

    const orchestrator = workflow([A, B]);
    const a = A();
    const b = B();
    orchestrator.register([a, b]);
    orchestrator.connect(a, b, true);

    orchestrator.start(a);
    const sA = orchestrator.getCurrentStep();
    assert(sA.status === 'ready' && sA.kind === 'A');
    sA.state.go();

    const sB = orchestrator.getCurrentStep();
    assert(sB.status === 'ready' && sB.kind === 'B');

    // Back should throw due to unidirectional edge
    expect(() => orchestrator.back()).toThrow();
  });
});
