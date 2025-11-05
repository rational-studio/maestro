import { conditionalEdge, step, transformEdge, workflow } from '@motif-ts/core';
import { describe, expect, it } from 'vitest';
import z from 'zod/v4';

import persist from '../../src/persist';
import { WORKFLOW_EXPORT_SCHEMA_VERSION } from '../../src/persist/constants';

describe('Export workflow - basic and full', () => {
  it('exports basic configuration with nodes and edges', () => {
    const A = step({ kind: 'A', outputSchema: z.number() }, ({ next }) => ({ go: () => next(1) }));
    const B = step({ kind: 'B', inputSchema: z.number() }, () => ({ done: true }));

    const wf = persist(workflow(), [A, B]);
    const a = A('a');
    const b = B('b');
    wf.register([a, b]);
    wf.connect(a, b);

    wf.start(a);
    const basic = wf.exportWorkflow('basic');
    // Snapshot ensures full structure correctness (schemaVersion, nodes, edges, etc.)
    expect(basic).toMatchSnapshot('basic-export');
    // Minimal invariant check to ensure snapshot remains meaningful
    expect(basic.schemaVersion).toBe(WORKFLOW_EXPORT_SCHEMA_VERSION);
  });

  it('exports full state including current, history and stores', () => {
    const StoreStep = step(
      { kind: 'S', outputSchema: z.number(), configSchema: z.object({ v: z.number() }), createStore: () => ({ v: 0 }) },
      ({ config, next }) => ({ run: () => next(config.v) }),
    );
    const Sink = step({ kind: 'T', inputSchema: z.number() }, ({ input }) => ({ value: input }));

    const wf = persist(workflow(), [StoreStep, Sink]);
    const s = StoreStep('s', { v: 42 });
    const t = Sink('t');
    wf.register([s, t]);
    wf.connect(s, t);

    wf.start(s);
    const full = wf.exportWorkflow('full');
    // Snapshot full export including current step, history, and stores
    expect(full).toMatchSnapshot('full-export');
    expect(full.schemaVersion).toBe(WORKFLOW_EXPORT_SCHEMA_VERSION);
  });

  it('exports edges with conditional and transform kinds', () => {
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

    const wf = persist(workflow(), [Emitter, Even, Odd, A, B]);
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
    expect(basic.edges).toEqual([
      { kind: 'conditional', from: emitter.id, to: even.id, unidirectional: false, config: 'out % 2 === 0' },
      { kind: 'conditional', from: emitter.id, to: odd.id, unidirectional: false, config: 'out % 2 !== 0' },
      {
        kind: 'transform',
        from: a.id,
        to: b.id,
        unidirectional: false,
        config: '{ username: out.name, years: out.age }',
      },
    ]);
  });
  it('exports when not started (no current node)', () => {
    const A = step({ kind: 'A' }, () => ({ noop: true }));
    const wf = persist(workflow(), [A]);
    const a = A('a');
    wf.register(a);

    const full = wf.exportWorkflow('full');
    // Snapshot not-started state to guarantee initial export correctness
    expect(full).toMatchSnapshot('full-export-not-started');
    expect(full.schemaVersion).toBe(WORKFLOW_EXPORT_SCHEMA_VERSION);
  });
});
