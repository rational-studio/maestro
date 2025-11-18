import { createEdge, createNode, seedInitial, useFlowStore, validateConnection } from '@/lib/flowState';
import type { Connection, Edge, Node } from 'reactflow';
import { beforeEach, describe, expect, it } from 'vitest';

beforeEach(() => {
  useFlowStore.setState({ nodes: [], edges: [], selected: { nodes: [], edges: [] }, snapshots: [] });
});

describe('flowState helpers', () => {
  it('creates nodes and edges', () => {
    const n = createNode('A', 0, 0);
    const m = createNode('B', 100, 0);
    expect(n.id).toBeTruthy();
    expect(m.id).toBeTruthy();
    const e = createEdge(n.id, m.id);
    expect(e.source).toBe(n.id);
    expect(e.target).toBe(m.id);
  });

  it('validates connections', () => {
    const a = createNode('A', 0, 0);
    const b = createNode('B', 100, 0);
    const nodes: Node[] = [a, b];
    const edges: Edge[] = [];
    const good: Connection = { source: a.id, target: b.id, sourceHandle: null, targetHandle: null };
    const badSelf: Connection = { source: a.id, target: a.id, sourceHandle: null, targetHandle: null };
    expect(validateConnection(good, nodes, edges)).toBe(true);
    expect(validateConnection(badSelf, nodes, edges)).toBe(false);
    edges.push(createEdge(a.id, b.id));
    expect(validateConnection(good, nodes, edges)).toBe(false);
  });

  it('stores snapshots and deletes selected', () => {
    seedInitial(useFlowStore);
    expect(useFlowStore.getState().nodes.length).toBeGreaterThan(0);
    useFlowStore.getState().addSnapshot();
    expect(useFlowStore.getState().snapshots.length).toBe(1);
    const id = useFlowStore.getState().nodes[0].id;
    useFlowStore.getState().select({ nodes: [id], edges: [] });
    useFlowStore.getState().deleteSelected();
    expect(useFlowStore.getState().nodes.find((n) => n.id === id)).toBeUndefined();
  });
});
