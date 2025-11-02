import type z from 'zod/v4';

import { type Edge } from '../edge/type';
import { type CleanupFn, type StepAPI, type StepInstance } from '../step/types';
import { SchemaBasic, SchemaEdge, SchemaFullState, WORKFLOW_EXPORT_SCHEMA_VERSION } from './constants';

type WorkflowExport = z.infer<typeof SchemaBasic | typeof SchemaFullState>;
type WorkflowExportBasic = z.infer<typeof SchemaBasic>;
type WorkflowExportFull = z.infer<typeof SchemaFullState>;

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
  transitionInto: <Input, Output, Config, Api extends StepAPI, Store>(
    node: StepInstance<Input, Output, Config, Api, Store>,
    input: Input,
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

  function exportWorkflow(mode: 'basic'): WorkflowExportBasic;
  function exportWorkflow(mode: 'full'): WorkflowExportFull;
  function exportWorkflow(mode: 'basic' | 'full'): WorkflowExport {
    const base: Omit<WorkflowExportBasic, 'format'> & { $schema: string; $id: string } = {
      schemaVersion: WORKFLOW_EXPORT_SCHEMA_VERSION,
      libraryVersion: undefined,
      inventoryKinds: Array.from(inventoryMap.keys()),
      nodes: Array.from(nodes).map((n) => ({ id: n.id, kind: n.kind, name: n.name, config: n.config })),
      edges: edges.map((e) => e.serialize()),
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://motif-ts.dev/schemas/workflow-export.json',
    };
    if (mode === 'basic') {
      const payload: WorkflowExportBasic = { format: 'motif-ts/basic', ...base };
      SchemaBasic.parse(payload);
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
    SchemaFullState.parse(payload);
    return payload;
  }

  function importWorkflow(mode: 'basic', data: WorkflowExportBasic): void;
  function importWorkflow(mode: 'full', data: WorkflowExportFull): void;
  function importWorkflow(mode: 'basic' | 'full', data: WorkflowExport): void {
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
        const parsed = SchemaBasic.parse(data);
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
          // WIP: Add Edge deserialization
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

      const parsed = SchemaFullState.parse(data);
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
        // WIP: Add Edge deserialization
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
  }

  return { exportWorkflow, importWorkflow };
}
