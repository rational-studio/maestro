import type { Connection, Edge, Node } from 'reactflow';
import { create } from 'zustand';

function uid() {
  return Math.random().toString(36).slice(2);
}

export function createNode(label: string, x: number, y: number): Node {
  return {
    id: uid(),
    type: 'motif',
    position: { x, y },
    data: { label },
  } as Node;
}

export function createEdge(source: string, target: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: 'smoothstep',
  } as Edge;
}

export function validateConnection(params: Connection, nodes: Node[], edges: Edge[]) {
  if (!params.source || !params.target) return false;
  if (params.source === params.target) return false;
  const sourceExists = nodes.some((n) => n.id === params.source);
  const targetExists = nodes.some((n) => n.id === params.target);
  if (!sourceExists || !targetExists) return false;
  const duplicate = edges.some((e) => e.source === params.source && e.target === params.target);
  if (duplicate) return false;
  return true;
}

type Snapshot = { nodes: Node[]; edges: Edge[] };

type FlowStore = {
  nodes: Node[];
  edges: Edge[];
  selected: { nodes: string[]; edges: string[] };
  snapshots: Snapshot[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  select: (sel: { nodes: string[]; edges: string[] }) => void;
  addNode: (node: Node) => void;
  addEdge: (edge: Edge) => void;
  deleteSelected: () => void;
  addSnapshot: () => void;
};

export const useFlowStore = create<FlowStore>((set, get) => ({
  nodes: [],
  edges: [],
  selected: { nodes: [], edges: [] },
  snapshots: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  select: (sel) => set({ selected: sel }),
  addNode: (node) => set({ nodes: [...get().nodes, node] }),
  addEdge: (edge) => set({ edges: [...get().edges, edge] }),
  deleteSelected: () => {
    const sel = get().selected;
    const nodes = get().nodes.filter((n) => !sel.nodes.includes(n.id));
    const edges = get().edges.filter((e) => !sel.edges.includes(e.id));
    set({ nodes, edges });
  },
  addSnapshot: () => {
    const snap = { nodes: get().nodes, edges: get().edges };
    set({ snapshots: [...get().snapshots, snap] });
  },
}));

export function seedInitial(store: typeof useFlowStore) {
  const a = createNode('Start', 0, 0);
  const b = createNode('Task', 200, 0);
  const c = createNode('Done', 400, 0);
  const nodes = [a, b, c];
  const edges = [createEdge(a.id, b.id), createEdge(b.id, c.id)];
  store.getState().setNodes(nodes);
  store.getState().setEdges(edges);
}
