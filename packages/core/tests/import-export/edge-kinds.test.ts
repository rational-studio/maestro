import { describe, expect, it } from 'vitest';
import z from 'zod';

import { conditionalEdge, step, transformEdge, workflow } from '../../src';
import { WORKFLOW_EXPORT_SCHEMA_VERSION } from '../../src/workflow/types';

describe('Import/Export with edge kinds and expressions', () => {
  it('exports edges with kind and expr fields', () => {
    const Emitter = step({ kind: 'Emitter', outputSchema: z.number() }, ({ next }) => ({
      emit: (n: number) => next(n),
    }));
    const Even = step({ kind: 'Even', inputSchema: z.number() }, ({ input }) => ({ val: input }));
    const Odd = step({ kind: 'Odd', inputSchema: z.number() }, ({ input }) => ({ val: input }));
    const A = step({ kind: 'A', outputSchema: z.object({ name: z.string(), age: z.number() }) }, ({ next }) => ({
      go: (n: string, a: number) => next({ name: n, age: a }),
    }));
    const B = step({ kind: 'B', inputSchema: z.object({ username: z.string(), years: z.number() }) }, ({ input }) => ({
      who: () => input.username + ':' + input.years,
    }));

    const wf = workflow([Emitter, Even, Odd, A, B]);
    const emitter = Emitter('emitter');
    const even = Even('even');
    const odd = Odd('odd');
    const a = A('a');
    const b = B('b');
    wf.register([emitter, even, odd, a, b]);
    wf.connect(conditionalEdge(emitter, even, 'out % 2 === 0'));
    wf.connect(conditionalEdge(emitter, odd, 'out % 2 !== 0'));
    wf.connect(transformEdge(a, b, '{ username: out.name, years: out.age }'));

    const basic = wf.exportWorkflow('basic');
    // Validate that edges carry kind and expr correctly
    expect(basic.edges).toEqual([
      { kind: 'conditional', from: emitter.id, to: even.id, unidirectional: false, expr: 'out % 2 === 0' },
      { kind: 'conditional', from: emitter.id, to: odd.id, unidirectional: false, expr: 'out % 2 !== 0' },
      {
        kind: 'transform',
        from: a.id,
        to: b.id,
        unidirectional: false,
        expr: '{ username: out.name, years: out.age }',
      },
    ]);
  });

  it('imports basic payload with edge kinds and preserves behavior', () => {
    const Emitter = step({ kind: 'Emitter', outputSchema: z.number() }, ({ next }) => ({
      emit: (n: number) => next(n),
    }));
    const Even = step({ kind: 'Even', inputSchema: z.number(), outputSchema: z.number() }, ({ input }) => ({
      id: () => input,
    }));
    const Odd = step({ kind: 'Odd', inputSchema: z.number(), outputSchema: z.number() }, ({ input }) => ({
      id: () => input,
    }));

    const wf = workflow([Emitter, Even, Odd]);
    const payload = {
      format: 'motif-ts/basic' as const,
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      inventoryKinds: ['Emitter', 'Even', 'Odd'],
      nodes: [
        { id: 'Emitter_emitter', kind: 'Emitter', name: 'emitter' },
        { id: 'Even_even', kind: 'Even', name: 'even' },
        { id: 'Odd_odd', kind: 'Odd', name: 'odd' },
      ],
      edges: [
        { kind: 'conditional', from: 'Emitter_emitter', to: 'Even_even', unidirectional: false, expr: 'out % 2 === 0' },
        { kind: 'conditional', from: 'Emitter_emitter', to: 'Odd_odd', unidirectional: false, expr: 'out % 2 !== 0' },
      ],
    };

    wf.importWorkflow(payload, 'basic');
    const exp = wf.exportWorkflow('basic');
    expect(exp.schemaVersion).toBe(WORKFLOW_EXPORT_SCHEMA_VERSION);
    expect(exp.edges).toEqual(payload.edges);
  });

  it('rejects legacy edges (no kind) format', () => {
    const A = step({ kind: 'A', outputSchema: z.number() }, ({ next }) => ({ go: () => next(1) }));
    const B = step({ kind: 'B', inputSchema: z.number() }, ({ input }) => ({ id: () => input }));
    const wf = workflow([A, B]);
    const payload = {
      format: 'motif-ts/basic' as const,
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      inventoryKinds: ['A', 'B'],
      nodes: [
        { id: 'A_a', kind: 'A', name: 'a' },
        { id: 'B_b', kind: 'B', name: 'b' },
      ],
      edges: [{ from: 'A_a', to: 'B_b', unidirectional: false }],
    };
    expect(() => wf.importWorkflow(payload, 'basic')).toThrow();
  });
});
