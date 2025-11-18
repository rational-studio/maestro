'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Connection,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  useEdgesState,
  useNodesState,
} from 'reactflow';

import 'reactflow/dist/style.css';

type WorkflowAny = {
  getCurrentStep: () => any;
  subscribe: (cb: (s: any, running: boolean) => void) => () => void;
  connect: (...args: any[]) => any;
  $$INTERNAL: { nodes: Set<any>; edges: Array<{ from: any; to: any }> };
};

function MotifNode({ data }: { data: { label: string; active?: boolean } }) {
  return (
    <div
      className={
        data.active
          ? 'px-3 py-2 rounded-md bg-blue-700 text-white border border-blue-500 shadow-sm'
          : 'px-3 py-2 rounded-md bg-slate-800 text-white border border-slate-600 shadow-sm'
      }
    >
      {data.label}
    </div>
  );
}

const nodeTypes = { motif: MotifNode };

function toGraphNodesEdges(wf: WorkflowAny, activeId?: string): { nodes: Node[]; edges: Edge[] } {
  const nodesArr = Array.from(wf.$$INTERNAL.nodes);
  const edgesArr = wf.$$INTERNAL.edges;
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodesArr) {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edgesArr) {
    indeg.set(e.to.id, (indeg.get(e.to.id) || 0) + 1);
    adj.get(e.from.id)?.push(e.to.id);
  }
  const q: string[] = [];
  for (const [id, d] of indeg) {
    if (d === 0) q.push(id);
  }
  const order: string[] = [];
  while (q.length) {
    const id = q.shift() as string;
    order.push(id);
    for (const v of adj.get(id) || []) {
      const nd = (indeg.get(v) || 0) - 1;
      indeg.set(v, nd);
      if (nd === 0) q.push(v);
    }
  }
  if (order.length === 0) {
    order.push(...nodesArr.map((n) => n.id));
  }
  const indexById = new Map(order.map((id, i) => [id, i] as const));
  const nodes: Node[] = nodesArr.map((n) => ({
    id: n.id,
    type: 'motif',
    position: { x: (indexById.get(n.id) || 0) * 220, y: 0 },
    data: { label: `${n.kind}:${n.name}`, active: n.id === activeId },
  }));
  const edges: Edge[] = edgesArr.map(
    (e) =>
      ({
        id: `${e.from.id}-${e.to.id}`,
        source: e.from.id,
        target: e.to.id,
        type: 'smoothstep',
      }) as Edge,
  );
  return { nodes, edges };
}

export default function WorkflowGraph({ workflow }: { workflow: WorkflowAny }) {
  const current = workflow.getCurrentStep();
  const initialGraph = useMemo(() => toGraphNodesEdges(workflow, current.instance.id), [workflow, current.instance.id]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialGraph.edges);

  useEffect(() => {
    const unsub = workflow.subscribe((s, running) => {
      if (!running) return;
      const next = toGraphNodesEdges(workflow, s.instance.id);
      setNodes(next.nodes);
      setEdges(next.edges);
    });
    return () => {
      unsub();
    };
  }, [workflow, setNodes, setEdges]);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#334155', strokeWidth: 2 },
    }),
    [],
  );

  const isValidConnection = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return false;
      if (c.source === c.target) return false;
      const exists = edges.some((e) => e.source === c.source && e.target === c.target);
      return !exists;
    },
    [edges],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!isValidConnection(c)) return;
      const map = new Map(Array.from(workflow.$$INTERNAL.nodes).map((n) => [n.id, n] as const));
      const from = c.source ? map.get(c.source) : undefined;
      const to = c.target ? map.get(c.target) : undefined;
      if (!from || !to) return;
      workflow.connect(from, to);
      const next = toGraphNodesEdges(workflow, workflow.getCurrentStep().instance.id);
      setEdges(next.edges);
    },
    [isValidConnection, workflow, setEdges],
  );

  return (
    <div className="relative h-[500px] overflow-hidden rounded-xl border border-black/10 dark:border-white/15">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
