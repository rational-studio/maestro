import { conditionalEdge, edge, transformEdge, type StepCreatorAny, type WorkflowAPI } from '@motif-ts/core';
import { type DeserializableEdgeFunc } from '@motif-ts/core/src/edge/type';
import { type z } from 'zod/v4';

import { type SchemaBasic, type SchemaFullState } from './constants';
import { createImportExportHandlers } from './io';
import { validateInventory } from './validators';

interface PersistAPI<Creators extends readonly StepCreatorAny[]> {
  /**
   * Register nodes with the workflow.
   * @param nodesArg One or more nodes to register.
   */
  register(nodesArg: ReturnType<Creators[number]> | readonly ReturnType<Creators[number]>[]): WorkflowAPI<Creators>;
  /**
   * Export current workflow configuration or full state to JSON structure.
   * @param mode 'basic' for nodes/edges only; 'full' for including runtime state and history.
   */
  exportWorkflow(mode: 'basic'): z.infer<typeof SchemaBasic>;
  exportWorkflow(mode: 'full'): z.infer<typeof SchemaFullState>;
  /**
   * Import workflow configuration or full state from JSON. Operation is atomic; on any error, no changes are applied.
   * @param data The JSON object to import.
   * @param mode Must match the export format: 'basic' or 'full'.
   */
  importWorkflow(mode: 'basic', data: z.infer<typeof SchemaBasic>): void;
  importWorkflow(mode: 'full', data: z.infer<typeof SchemaFullState>): void;
}

export default function devtoolsMiddleware<const Creators extends readonly StepCreatorAny[]>(
  workflow: WorkflowAPI<Creators>,
  inventory: Creators,
): Omit<WorkflowAPI<Creators>, 'register'> & PersistAPI<Creators> {
  const { connect, getCurrentStep, subscribe, back, INTERNAL } = workflow;
  const edgeInventoryMap = new Map<string, DeserializableEdgeFunc>([
    ['default', edge],
    ['conditional', conditionalEdge],
    ['transform', transformEdge],
  ]);
  const stepInventoryMap: Map<string, StepCreatorAny> = new Map();

  // Validate duplicate kinds with detailed error information
  validateInventory(inventory);

  for (const creator of inventory) {
    stepInventoryMap.set(creator.kind, creator);
  }

  Object.freeze(inventory);

  // wire import/export handlers from separate module
  const { exportWorkflow, importWorkflow } = createImportExportHandlers({
    stepInventoryMap,
    edgeInventoryMap,
    nodes: INTERNAL.nodes,
    edges: INTERNAL.edges,
    history: INTERNAL.history,
    getCurrentStep: () => getCurrentStep(),
    getCurrentNode: () => INTERNAL.getCurrentNode(),
    getContext: () => INTERNAL.getContext(),
    setNotStarted: () => INTERNAL.setNotStarted(),
    runExitSequence: () => INTERNAL.runExitSequence(),
    transitionInto: (...args) => INTERNAL.transitionInto(...args),
  });

  return {
    register(nodesArg: ReturnType<Creators[number]> | readonly ReturnType<Creators[number]>[]) {
      const list = Array.isArray(nodesArg) ? nodesArg : [nodesArg];
      const allowed = Array.from(stepInventoryMap.keys()).join(', ');
      for (const node of list) {
        if (!stepInventoryMap.has(node.kind)) {
          throw new Error(
            `Cannot register StepInstance kind '${node.kind}'. Not listed in inventory. Allowed kinds: [${allowed}]`,
          );
        }
      }
      return workflow.register(nodesArg);
    },
    connect,
    start(node) {
      if (!stepInventoryMap.has(node.kind)) {
        const allowed = Array.from(stepInventoryMap.keys()).join(', ');
        throw new Error(
          `Cannot start on StepInstance kind '${node.kind}'. Not listed in inventory. Allowed kinds: [${allowed}]`,
        );
      }
      return workflow.start(node);
    },
    getCurrentStep,
    subscribe,
    back,
    INTERNAL,
    exportWorkflow,
    importWorkflow,
  } satisfies Omit<WorkflowAPI<Creators>, 'register'> & PersistAPI<Creators>;
}
