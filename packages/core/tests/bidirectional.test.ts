import { assert, describe, expect, it } from 'vitest';
import z from 'zod/v4';

import { step as Step, workflow } from '../src';

describe('motif-ts Workflow bidirectional transitions and cleanup', () => {
  it('supports forward and backward transitions with proper cleanup timing', () => {
    const logs: string[] = [];

    const A = Step(
      {
        kind: 'A',
        outputSchema: z.number(),
      },
      ({ transitionIn, transitionOut, effect, next }) => {
        transitionIn(() => {
          logs.push('A_in');
          return () => {
            logs.push('A_in_cleanup');
          };
        });
        transitionOut(() => {
          logs.push('A_out');
          return () => {
            logs.push('A_out_cleanup');
          };
        });
        effect(() => {
          logs.push('A_effect');
          return () => {
            logs.push('A_effect_cleanup');
          };
        });
        return {
          go: () => next(42),
        };
      },
    );

    const B = Step(
      {
        kind: 'B',
        inputSchema: z.number(),
        outputSchema: z.number(),
      },
      ({ transitionIn, transitionOut, effect, input, next }) => {
        transitionIn(() => {
          logs.push('B_in:' + input);
          return () => {
            logs.push('B_in_cleanup');
          };
        });
        transitionOut(() => {
          logs.push('B_out');
        });
        effect(() => {
          logs.push('B_effect');
          return () => {
            logs.push('B_effect_cleanup');
          };
        });
        return {
          go: () => next(input + 1),
        };
      },
    );

    const orchestrator = workflow([A, B]);
    const a = A();
    const b = B();
    orchestrator.register([a, b]);
    orchestrator.connect(a, b);

    orchestrator.start(a);
    const stepA = orchestrator.getCurrentStep();
    assert(stepA.status === 'ready' && stepA.kind === 'A');

    // Forward to B
    stepA.state.go();
    const stepB = orchestrator.getCurrentStep();
    assert(stepB.status === 'ready' && stepB.kind === 'B');

    // Back to A
    orchestrator.back();
    const stepA2 = orchestrator.getCurrentStep();
    assert(stepA2.status === 'ready' && stepA2.kind === 'A');

    // Forward again
    stepA2.state.go();
    const stepB2 = orchestrator.getCurrentStep();
    assert(stepB2.status === 'ready' && stepB2.kind === 'B');

    // Verify cleanup timing and order groups (not strict total order, but presence)
    // A entered once initially, then exited twice (forward and forward again via back)
    expect(logs).toContain('A_in');
    expect(logs.filter((l) => l === 'A_out').length).toBe(2);
    expect(logs.filter((l) => l === 'A_in_cleanup').length).toBe(2);
    expect(logs.filter((l) => l === 'A_effect_cleanup').length).toBe(2);

    // B entered twice and exited once (back) + once (final forward if future)
    expect(logs.filter((l) => l.startsWith('B_in:')).length).toBe(2);
    expect(logs.filter((l) => l === 'B_out').length).toBe(1);
    expect(logs.filter((l) => l === 'B_in_cleanup').length).toBe(1);
    expect(logs.filter((l) => l === 'B_effect_cleanup').length).toBe(1);
  });

  it('throws errors in hooks and caller must handle them', () => {
    const logs: string[] = [];

    const A = Step(
      {
        kind: 'A',
        outputSchema: z.number(),
      },
      ({ transitionIn, transitionOut, next }) => {
        transitionIn(() => {
          logs.push('A_in');
          return () => {
            logs.push('A_in_cleanup');
            throw new Error('in cleanup error');
          };
        });
        transitionOut(() => {
          logs.push('A_out');
          throw new Error('out hook error');
        });
        return {
          go: () => next(1),
        };
      },
    );

    const B = Step(
      {
        kind: 'B',
        inputSchema: z.number(),
        outputSchema: z.number(),
      },
      ({ transitionIn, input }) => {
        transitionIn(() => {
          logs.push('B_in:' + input);
          throw new Error('B in hook error');
        });
        return {
          whoami: () => 'B',
        };
      },
    );

    const orchestrator = workflow([A, B]);
    const a = A();
    const b = B();
    orchestrator.register([a, b]);
    orchestrator.connect(a, b);

    orchestrator.start(a);
    const stepA = orchestrator.getCurrentStep();
    assert(stepA.status === 'ready' && stepA.kind === 'A');
    // Forward to B: A.transitionOut throws
    expect(() => stepA.state.go()).toThrow('out hook error');
    // Ensure logs recorded before throws
    expect(logs).toContain('A_in');
    expect(logs).toContain('A_out');
  });
});
