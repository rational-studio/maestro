import { assert, describe, expect, it } from 'vitest';
import z from 'zod/v4';

import { conditionalEdge, step, workflow } from '../../src';

describe('ConditionalEdge: predicate controls transition', () => {
  it('allows transition when predicate returns true; blocks when false', () => {
    const Emitter = step({ kind: 'Emitter', outputSchema: z.number() }, ({ next }) => ({
      emitEven: () => next(2),
      emitOdd: () => next(3),
    }));
    const AcceptEven = step({ kind: 'AcceptEven', inputSchema: z.number(), outputSchema: z.number() }, ({ input }) => ({
      id: () => input,
    }));

    const AcceptOdd = step({ kind: 'AcceptOdd', inputSchema: z.number(), outputSchema: z.number() }, ({ input }) => ({
      id: () => input,
    }));

    const orchestrator = workflow([Emitter, AcceptEven, AcceptOdd]);
    const emitter = Emitter();
    const even = AcceptEven();
    const odd = AcceptOdd();
    orchestrator.register([emitter, even, odd]);
    // use expression-based predicate referencing env { out }
    orchestrator.connect(conditionalEdge(emitter, even, 'out % 2 === 0'));
    orchestrator.connect(conditionalEdge(emitter, odd, 'out % 2 !== 0'));

    orchestrator.start(emitter);
    const sA1 = orchestrator.getCurrentStep();
    assert(sA1.status === 'ready' && sA1.kind === 'Emitter');
    sA1.state.emitOdd();

    const sB = orchestrator.getCurrentStep();
    assert(sB.status === 'ready' && sB.kind === 'AcceptOdd');
    expect(sB.state.id()).toBe(3);

    // Go back to A, then try odd which should be blocked
    orchestrator.back();
    const sA2 = orchestrator.getCurrentStep();
    assert(sA2.status === 'ready' && sA2.kind === 'Emitter');
    sA2.state.emitEven();

    const sC = orchestrator.getCurrentStep();
    assert(sC.status === 'ready' && sC.kind === 'AcceptEven');
    expect(sC.state.id()).toBe(2);
  });
});
