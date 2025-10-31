import { describe, it, expect } from 'vitest';
import z from 'zod';
import { step, workflow } from '../../src';
import { WORKFLOW_EXPORT_SCHEMA_VERSION } from '../../src/workflow/types';

describe('Import workflow - basic and full', () => {
  it('imports basic configuration and replaces nodes/edges atomically', () => {
    const A = step({ kind: 'A', outputSchema: z.number() }, ({ next }) => ({ go: () => next(1) }));
    const B = step({ kind: 'B', inputSchema: z.number() }, () => ({ done: true }));

    const wf = workflow([A, B]);

    const importPayload = {
      format: 'motif-ts/basic',
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      libraryVersion: undefined,
      inventoryKinds: ['A', 'B'],
      nodes: [
        { id: 'A_a', kind: 'A', name: 'a', config: undefined },
        { id: 'B_b', kind: 'B', name: 'b', config: undefined },
      ],
      edges: [{ kind: 'default', from: 'A_a', to: 'B_b', unidirectional: false }],
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://motif-ts.dev/schemas/workflow-export.json',
    };

    wf.importWorkflow(importPayload, 'basic');
    // After import, register/connect in runtime are replaced by payload
    const exportPayload = wf.exportWorkflow('basic');
    expect(exportPayload).toEqual(importPayload);
  });

  it('imports full state and restores current and stores', () => {
    const S = step({ kind: 'S', outputSchema: z.number(), createStore: () => ({ v: 0 }) }, ({ next }) => ({ run: () => next(1) }));
    const T = step({ kind: 'T', inputSchema: z.number() }, ({ input }) => ({ val: input }));
    const wf = workflow([S, T]);

    const importPayload = {
      format: 'motif-ts/full',
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      libraryVersion: undefined,
      inventoryKinds: ['S', 'T'],
      nodes: [
        { id: 'S_s', kind: 'S', name: 's', config: undefined },
        { id: 'T_t', kind: 'T', name: 't', config: undefined },
      ],
      edges: [{ kind: 'default', from: 'S_s', to: 'T_t', unidirectional: false }],
      state: {
        current: { nodeId: 'S_s', status: 'ready', input: undefined },
        history: [{ nodeId: 'S_s', input: undefined }],
        stores: { S_s: { v: 123 } },
      },
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://motif-ts.dev/schemas/workflow-export.json',
    };

    wf.importWorkflow(importPayload, 'full');
    const exportPayload = wf.exportWorkflow('full');
    expect(exportPayload).toEqual(importPayload);
  });

  it('rejects invalid schema version', () => {
    const A = step({ kind: 'A' }, () => ({ ok: true }));
    const wf = workflow([A]);
    const bad = {
      format: 'motif-ts/basic',
      schemaVersion: '0.0.1',
      inventoryKinds: ['A'],
      nodes: [{ id: 'A_a', kind: 'A', name: 'a' }],
      edges: [],
    };
    expect(() => wf.importWorkflow(bad, 'basic')).toThrow();
  });

  it('rejects import when inventoryKinds not compatible', () => {
    const A = step({ kind: 'A' }, () => ({ ok: true }));
    const wf = workflow([A]);
    const bad = {
      format: 'motif-ts/basic',
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      inventoryKinds: ['B'],
      nodes: [],
      edges: [],
    };
    expect(() => wf.importWorkflow(bad, 'basic')).toThrow();
  });

  it('rejects when edge references unknown node', () => {
    const A = step({ kind: 'A' }, () => ({ ok: true }));
    const wf = workflow([A]);
    const bad = {
      format: 'motif-ts/basic',
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      inventoryKinds: ['A'],
      nodes: [{ id: 'A_a', kind: 'A', name: 'a' }],
      edges: [{ kind: 'default', from: 'A_a', to: 'B_b', unidirectional: false }],
    };
    expect(() => wf.importWorkflow(bad, 'basic')).toThrow();
  });
});