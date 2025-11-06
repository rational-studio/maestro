import { step, workflow } from '@motif-ts/core';
import { describe, expect, it } from 'vitest';
import z from 'zod/v4';

import persist from '../../src/persist';
import { WORKFLOW_EXPORT_SCHEMA_VERSION } from '../../src/persist/constants';

describe('Performance - large workflow export/import', () => {
  it('handles large number of nodes and edges efficiently', () => {
    const Node = step({ kind: 'N', outputSchema: z.number() }, ({ next }) => ({ go: (x: number) => next(x) }));
    const wf = persist(workflow([Node]));

    const nodes = [];
    for (let i = 0; i < 1000; i++) {
      nodes.push(Node('n' + i));
    }
    wf.register(nodes);
    for (let i = 0; i < 999; i++) {
      wf.connect(nodes[i], nodes[i + 1]);
    }

    const start = Date.now();
    const basic = wf.exportWorkflow('basic');
    const durExport = Date.now() - start;

    expect(basic.nodes.length).toBe(1000);
    expect(basic.edges.length).toBe(999);
    expect(durExport).toBeLessThan(2000);

    const payload = {
      ...basic,
      format: 'motif-ts/basic',
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
    } as const;
    const startImport = Date.now();
    wf.importWorkflow('basic', payload);
    const durImport = Date.now() - startImport;
    expect(durImport).toBeLessThan(10);
  });
});
