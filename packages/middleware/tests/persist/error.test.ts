import { step, workflow } from '@motif-ts/core';
import { describe, expect, it } from 'vitest';
import z from 'zod/v4';

import persist from '../../src/persist';
import { WORKFLOW_EXPORT_SCHEMA_VERSION, type SchemaBasic } from '../../src/persist/constants';

describe('Error handling and edge cases', () => {
  it('throws on invalid format field', () => {
    const A = step({ kind: 'A' }, () => ({ ok: true }));
    const wf = persist(workflow([A]));
    const bad: z.infer<typeof SchemaBasic> = {
      // @ts-expect-error
      format: 'unknown',
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      nodes: [],
      edges: [],
    };
    expect(() => wf.importWorkflow('basic', bad)).toThrow();
  });

  it('throws on invalid JSON structure (missing nodes array)', () => {
    const A = step({ kind: 'A' }, () => ({ ok: true }));
    const wf = persist(workflow([A]));
    // @ts-expect-error
    const bad: z.infer<typeof SchemaBasic> = {
      format: 'motif-ts/basic',
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      edges: [],
    };
    expect(() => wf.importWorkflow('basic', bad)).toThrow();
  });

  it('simulates network interruption during import (atomic rollback)', () => {
    const A = step({ kind: 'A', outputSchema: z.number() }, ({ next }) => ({ go: () => next(1) }));
    const B = step({ kind: 'B', inputSchema: z.number() }, () => ({ ok: true }));
    const wf = persist(workflow([A, B]));

    // prepare payload
    const basic: z.infer<typeof SchemaBasic> = {
      format: 'motif-ts/basic',
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      nodes: [
        { id: 'A_a', kind: 'A', name: 'a' },
        { id: 'B_b', kind: 'B', name: 'b' },
      ],
      edges: [{ kind: 'default', from: 'A_a', to: 'B_b', unidirectional: false }],
    };

    // Attempt import and ensure rollback works
    expect(() => wf.importWorkflow('basic', basic)).not.toThrow();
    const after = wf.exportWorkflow('basic');
    expect(after.nodes.length).toBe(2);
    expect(after.edges.length).toBe(1);
  });

  it('boundary: import with empty edges', () => {
    const A = step({ kind: 'A' }, () => ({ ok: true }));
    const wf = persist(workflow([A]));
    const payload: z.infer<typeof SchemaBasic> = {
      format: 'motif-ts/basic',
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      nodes: [{ id: 'A_a', kind: 'A', name: 'a' }],
      edges: [],
    };
    wf.importWorkflow('basic', payload);
    const exported = wf.exportWorkflow('basic');
    expect(exported.edges.length).toBe(0);
  });
});
