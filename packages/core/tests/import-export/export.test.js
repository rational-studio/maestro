import { describe, it, expect } from 'vitest';
import z from 'zod';
import { step, workflow } from '../../src';
import { WORKFLOW_EXPORT_SCHEMA_VERSION } from '../../src/workflow/types';

describe('Export workflow - basic and full', () => {
  it('exports basic configuration with nodes and edges', () => {
    const A = step({ kind: 'A', outputSchema: z.number() }, ({ next }) => ({ go: () => next(1) }));
    const B = step({ kind: 'B', inputSchema: z.number() }, () => ({ done: true }));

    const wf = workflow([A, B]);
    const a = A('a');
    const b = B('b');
    wf.register([a, b]);
    wf.connect(a, b);

    wf.start(a);
    const basic = wf.exportWorkflow('basic');
    // Snapshot ensures full structure correctness (schemaVersion, inventoryKinds, nodes, edges, etc.)
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

    const wf = workflow([StoreStep, Sink]);
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

  it('exports when not started (no current node)', () => {
    const A = step({ kind: 'A' }, () => ({ noop: true }));
    const wf = workflow([A]);
    const a = A('a');
    wf.register(a);

    const full = wf.exportWorkflow('full');
    // Snapshot not-started state to guarantee initial export correctness
    expect(full).toMatchSnapshot('full-export-not-started');
    expect(full.schemaVersion).toBe(WORKFLOW_EXPORT_SCHEMA_VERSION);
  });
});