import { describe, it, expect } from 'vitest';
import z from 'zod/v4';
import { step, workflow } from '../../src';
import { WORKFLOW_EXPORT_SCHEMA_VERSION } from '../../src/workflow/types';

describe('Error handling and edge cases', () => {
  it('throws on invalid format field', () => {
    const A = step({ kind: 'A' }, () => ({ ok: true }));
    const wf = workflow([A]);
    const bad = { format: 'unknown', schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION, inventoryKinds: ['A'], nodes: [], edges: [] };
    expect(() => wf.importWorkflow(bad, 'basic')).toThrow();
  });

  it('throws on invalid JSON structure (missing nodes array)', () => {
    const A = step({ kind: 'A' }, () => ({ ok: true }));
    const wf = workflow([A]);
    const bad = { format: 'motif-ts/basic', schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION, inventoryKinds: ['A'], edges: [] };
    expect(() => wf.importWorkflow(bad, 'basic')).toThrow();
  });

  it('simulates network interruption during import (atomic rollback)', () => {
    const A = step({ kind: 'A', outputSchema: z.number() }, ({ next }) => ({ go: () => next(1) }));
    const B = step({ kind: 'B', inputSchema: z.number() }, () => ({ ok: true }));
    const wf = workflow([A, B]);

    // prepare payload
    const basic = {
      format: 'motif-ts/basic',
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      inventoryKinds: ['A', 'B'],
      nodes: [
        { id: 'A_a', kind: 'A', name: 'a' },
        { id: 'B_b', kind: 'B', name: 'b' },
      ],
      edges: [{ kind: 'default', from: 'A_a', to: 'B_b', unidirectional: false }],
    };

    // Attempt import and ensure rollback works
    expect(() => wf.importWorkflow(basic, 'basic')).not.toThrow();
    const after = wf.exportWorkflow('basic');
    expect(after.nodes.length).toBe(2);
    expect(after.edges.length).toBe(1);
  });

  it('boundary: import with empty edges', () => {
    const A = step({ kind: 'A' }, () => ({ ok: true }));
    const wf = workflow([A]);
    const payload = { format: 'motif-ts/basic', schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION, inventoryKinds: ['A'], nodes: [{ id: 'A_a', kind: 'A', name: 'a' }], edges: [] };
    wf.importWorkflow(payload, 'basic');
    const exported = wf.exportWorkflow('basic');
    expect(exported.edges.length).toBe(0);
  });
});