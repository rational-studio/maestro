import { z } from 'zod';

import { conditionalEdge, edge, transformEdge } from '../edge';
import { type Edge } from '../edge/type';
import { type CleanupFn, type StepAPI, type StepCreatorAny, type StepInstance } from '../step/types';
import {
  WORKFLOW_EXPORT_SCHEMA_VERSION,
  type WorkflowExport,
  type WorkflowExportBasic,
  type WorkflowExportFull,
} from './types';

type HandlersDeps = {
  inventoryMap: Map<string, any>;
  nodes: Set<StepInstance<any, any, any, any, any>>;
  edges: Edge<any, any>[];
  history: Array<{ node: StepInstance<any, any, any, any, any>; input: unknown; outCleanupOnBack: CleanupFn[] }>;
  getCurrentStep: () => { status: 'notStarted' | 'transitionIn' | 'ready' | 'transitionOut' } | any;
  getCurrentNode: () => StepInstance<any, any, any, any, any> | undefined;
  getContext: () => any;
  setNotStarted: () => void;
  runExitSequence: () => CleanupFn[];
  transitionInto: <I, O, C, Api extends StepAPI, Store>(
    node: StepInstance<I, O, C, Api, Store>,
    input: I,
    isBack: boolean,
    backCleanups: CleanupFn[],
  ) => void;
};

export function createImportExportHandlers(deps: HandlersDeps) {
  const {
    inventoryMap,
    nodes,
    edges,
    history,
    getCurrentStep,
    getCurrentNode,
    getContext,
    setNotStarted,
    runExitSequence,
    transitionInto,
  } = deps;

  // Schemas
  const ZNode = z.object({ id: z.string(), kind: z.string(), name: z.string(), config: z.unknown().optional() });
  // Support both new and old edge formats for backward compatibility.
  // Use discriminated union by 'kind' to ensure conditional/transform require 'expr'.
  const ZEdgeDefault = z.object({
    kind: z.literal('default'),
    from: z.string(),
    to: z.string(),
    unidirectional: z.boolean(),
  });
  const ZEdgeConditional = z.object({
    kind: z.literal('conditional'),
    from: z.string(),
    to: z.string(),
    unidirectional: z.boolean(),
    expr: z.string(),
  });
  const ZEdgeTransform = z.object({
    kind: z.literal('transform'),
    from: z.string(),
    to: z.string(),
    unidirectional: z.boolean(),
    expr: z.string(),
  });
  const ZEdge = z.discriminatedUnion('kind', [ZEdgeDefault, ZEdgeConditional, ZEdgeTransform]);
  const ZBase = z.object({
    schemaVersion: z.literal(WORKFLOW_EXPORT_SCHEMA_VERSION),
    libraryVersion: z.string().optional(),
    inventoryKinds: z.array(z.string()),
    nodes: z.array(ZNode),
    edges: z.array(ZEdge),
    $schema: z.string().optional(),
    $id: z.string().optional(),
  });
  const ZBasic = ZBase.extend({ format: z.literal('motif-ts/basic') });
  const ZFull = ZBase.extend({
    format: z.literal('motif-ts/full'),
    state: z.object({
      current: z.object({
        nodeId: z.string().nullable().optional(),
        status: z.union([
          z.literal('notStarted'),
          z.literal('transitionIn'),
          z.literal('ready'),
          z.literal('transitionOut'),
        ]),
        input: z.any().optional(),
      }),
      history: z.array(z.object({ nodeId: z.string(), input: z.any().optional() })),
      stores: z.record(z.string(), z.any()),
    }),
  });

  const exportWorkflow = (mode: 'basic' | 'full'): WorkflowExport => {
    const base: Omit<WorkflowExportBasic, 'format'> & { $schema: string; $id: string } = {
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      libraryVersion: undefined,
      inventoryKinds: Array.from(inventoryMap.keys()),
      nodes: Array.from(nodes).map((n) => ({ id: n.id, kind: n.kind, name: n.name, config: n.config })),
      edges: edges.map((e) => {
        switch (e.kind) {
          case 'default':
            return { kind: 'default' as const, from: e.from.id, to: e.to.id, unidirectional: e.unidirectional };
          case 'conditional':
            return {
              kind: 'conditional' as const,
              from: e.from.id,
              to: e.to.id,
              unidirectional: e.unidirectional,
              expr: e.exprSrc,
            };
          case 'transform':
            return {
              kind: 'transform' as const,
              from: e.from.id,
              to: e.to.id,
              unidirectional: e.unidirectional,
              expr: e.exprSrc,
            };
        }
      }),
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://motif-ts.dev/schemas/workflow-export.json',
    };
    if (mode === 'basic') {
      const payload: WorkflowExportBasic = { format: 'motif-ts/basic', ...base };
      ZBasic.parse(payload);
      return payload;
    }
    const currentNodeId = getCurrentNode()?.id ?? null;
    const payload: WorkflowExportFull = {
      format: 'motif-ts/full',
      ...base,
      state: {
        current: {
          nodeId: currentNodeId,
          status: getCurrentStep().status,
          input: getContext()?.currentInput,
        },
        history: history.map((h) => ({ nodeId: h.node.id, input: h.input })),
        stores: (() => {
          const obj: Record<string, unknown> = {};
          const arr = Array.from(nodes);
          for (let i = 0; i < arr.length; i++) {
            const n = arr[i];
            const state = n.storeApi?.getState();
            if (state !== undefined) {
              obj[n.id] = state;
            }
          }
          return obj;
        })(),
      },
    };
    ZFull.parse(payload);
    return payload;
  };

  const importWorkflow = (data: WorkflowExport, mode: 'basic' | 'full') => {
    const oldNodes = Array.from(nodes);
    const oldEdges = edges.slice();
    const oldHistory = history.slice();
    const oldStoreStates: Record<string, unknown> = (() => {
      const obj: Record<string, unknown> = {};
      const arr = Array.from(nodes);
      for (let i = 0; i < arr.length; i++) {
        const n = arr[i];
        const state = n.storeApi ? n.storeApi.getState() : undefined;
        if (state !== undefined) {
          obj[n.id] = state;
        }
      }
      return obj;
    })();

    try {
      if (mode === 'basic') {
        const parsed = ZBasic.parse(data);
        for (const k of parsed.inventoryKinds) {
          if (!inventoryMap.has(k)) {
            throw new Error(`Import error: inventory kind '${k}' not available in current workflow inventory.`);
          }
        }
        const nextNodesById = new Map<string, StepInstance<any, any, any, any, any>>();
        for (const nd of parsed.nodes) {
          const creator = inventoryMap.get(nd.kind);
          if (!creator) {
            throw new Error(`Import error: step kind '${nd.kind}' not found in inventory.`);
          }
          let instance: StepInstance<any, any, any, any, any>;
          try {
            if (nd.config !== undefined) {
              instance = creator(nd.name, nd.config);
            } else {
              instance = creator(nd.name);
            }
          } catch (e: any) {
            throw new Error(`Import error: failed to instantiate node '${nd.id}'. Reason: ${e?.message ?? String(e)}`);
          }
          if (instance.id !== nd.id) {
            throw new Error(
              `Import error: node id mismatch for kind '${nd.kind}' name '${nd.name}'. Expected '${nd.id}', got '${instance.id}'.`,
            );
          }
          nextNodesById.set(nd.id, instance);
        }
        const nextEdges: Edge<any, any>[] = [];
        for (const ed of parsed.edges) {
          const from = nextNodesById.get(ed.from);
          const to = nextNodesById.get(ed.to);
          if (!from || !to) {
            throw new Error(
              `Import error: edge references unknown node(s): from='${ed.from}' to='${ed.to}'. Ensure nodes exist.`,
            );
          }
          if (ed.kind === 'default') {
            nextEdges.push(edge<any, any>(from, to, ed.unidirectional));
          } else if (ed.kind === 'conditional') {
            nextEdges.push(conditionalEdge<any, any>(from, to, ed.expr, ed.unidirectional));
          } else if (ed.kind === 'transform') {
            nextEdges.push(transformEdge<any, any>(from, to, ed.expr, ed.unidirectional));
          } else {
            throw new Error(`Import error: unknown edge kind '${(ed as any).kind}'.`);
          }
        }
        // Clear runtime state and apply
        runExitSequence();
        history.splice(0, history.length);
        setNotStarted();
        nodes.clear();
        for (const n of nextNodesById.values()) {
          nodes.add(n);
        }
        edges.splice(0, edges.length);
        for (const e of nextEdges) {
          edges.push(e);
        }
        return;
      }

      const parsed = ZFull.parse(data);
      for (const k of parsed.inventoryKinds) {
        if (!inventoryMap.has(k)) {
          throw new Error(`Import error: inventory kind '${k}' not available in current workflow inventory.`);
        }
      }
      const nextNodesById = new Map<string, StepInstance<any, any, any, any, any>>();
      for (const nd of parsed.nodes) {
        const creator = inventoryMap.get(nd.kind);
        if (!creator) {
          throw new Error(`Import error: step kind '${nd.kind}' not found in inventory.`);
        }
        let instance: StepInstance<any, any, any, any, any>;
        try {
          if (nd.config !== undefined) {
            instance = creator(nd.name, nd.config);
          } else {
            instance = creator(nd.name);
          }
        } catch (e: any) {
          throw new Error(`Import error: failed to instantiate node '${nd.id}'. Reason: ${e?.message ?? String(e)}`);
        }
        if (instance.id !== nd.id) {
          throw new Error(
            `Import error: node id mismatch for kind '${nd.kind}' name '${nd.name}'. Expected '${nd.id}', got '${instance.id}'.`,
          );
        }
        nextNodesById.set(nd.id, instance);
      }
      for (const nodeId in parsed.state.stores) {
        const state = (parsed.state.stores as Record<string, unknown>)[nodeId];
        const inst = nextNodesById.get(nodeId);
        if (!inst) {
          throw new Error(`Import error: store state references unknown node '${nodeId}'.`);
        }
        if (!inst.storeApi) {
          throw new Error(`Import error: node '${nodeId}' does not have a store, but store state provided.`);
        }
        // Use the parameter type of setState for precise casting
        inst.storeApi.setState(state as Parameters<typeof inst.storeApi.setState>[0]);
      }
      const nextEdges: Edge<any, any>[] = [];
      for (const ed of parsed.edges) {
        const from = nextNodesById.get(ed.from);
        const to = nextNodesById.get(ed.to);
        if (!from || !to) {
          throw new Error(
            `Import error: edge references unknown node(s): from='${ed.from}' to='${ed.to}'. Ensure nodes exist.`,
          );
        }
        if (ed.kind === 'default') {
          nextEdges.push(edge<any, any>(from, to, ed.unidirectional));
        } else if (ed.kind === 'conditional') {
          nextEdges.push(conditionalEdge<any, any>(from, to, ed.expr, ed.unidirectional));
        } else if (ed.kind === 'transform') {
          nextEdges.push(transformEdge<any, any>(from, to, ed.expr, ed.unidirectional));
        } else {
          throw new Error(`Import error: unknown edge kind '${(ed as any).kind}'.`);
        }
      }
      const nextHistory: typeof history = [];
      for (const h of parsed.state.history) {
        const inst = nextNodesById.get(h.nodeId);
        if (!inst) {
          throw new Error(`Import error: history references unknown node '${h.nodeId}'.`);
        }
        nextHistory.push({ node: inst, input: h.input, outCleanupOnBack: [] });
      }

      runExitSequence();
      nodes.clear();
      for (const n of nextNodesById.values()) {
        nodes.add(n);
      }
      edges.splice(0, edges.length);
      for (const e of nextEdges) {
        edges.push(e);
      }
      history.splice(0, history.length, ...nextHistory);

      const curId = parsed.state.current.nodeId;
      if (!curId) {
        setNotStarted();
        return;
      }
      const curNode = nextNodesById.get(curId);
      if (!curNode) {
        throw new Error(`Import error: current.nodeId '${curId}' not found among nodes.`);
      }
      transitionInto(curNode, parsed.state.current.input, false, []);
      return;
    } catch (err) {
      // Rollback
      nodes.clear();
      for (const n of oldNodes) {
        nodes.add(n);
      }
      edges.splice(0, edges.length, ...oldEdges);
      history.splice(0, history.length, ...oldHistory);
      for (const nodeId in oldStoreStates) {
        const prevStates = oldStoreStates;
        const state = prevStates[nodeId];
        const inst = Array.from(nodes).find((n) => n.id === nodeId);
        if (inst?.storeApi && state !== undefined) {
          inst.storeApi.setState(state);
        }
      }
      throw err;
    }
  };

  return { exportWorkflow, importWorkflow };
}
