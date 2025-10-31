import { type Edge } from '../edge/type';
import { type StepAPI, type StepCreatorAny, type StepInstance } from '../step/types';

export type TransitionStatus = 'notStarted' | 'transitionIn' | 'ready' | 'transitionOut';

export type CurrentStepNotStarted = { status: 'notStarted' };
export type CurrentStepStarted<Creators extends readonly StepCreatorAny[]> = {
  status: Exclude<TransitionStatus, 'notStarted'>;
} & {
  [K in Creators[number]['kind']]: {
    kind: K;
    name: string;
    state: ReturnType<
      ReturnType<
        Extract<
          Creators[number],
          {
            kind: K;
          }
        >
      >['build']
    >;
  };
}[Creators[number]['kind']];

export type CurrentStep<Creators extends readonly StepCreatorAny[]> =
  | CurrentStepNotStarted
  | CurrentStepStarted<Creators>;

// Export/Import schema version
export const WORKFLOW_EXPORT_SCHEMA_VERSION = '1.0.0' as const;

// Shared base for exports
export interface WorkflowExportBase {
  schemaVersion: typeof WORKFLOW_EXPORT_SCHEMA_VERSION;
  libraryVersion?: string;
  inventoryKinds: string[];
  nodes: Array<{
    id: string;
    kind: string;
    name: string;
    config?: unknown;
  }>;
  edges: Array<{
    from: string;
    to: string;
    unidirectional: boolean;
  }>;
}

// Basic configuration export structure
export interface WorkflowExportBasic extends WorkflowExportBase {
  format: 'motif-ts/basic';
}

// Full export extends base with runtime state
export interface WorkflowExportFull extends WorkflowExportBase {
  format: 'motif-ts/full';
  state: {
    current: {
      nodeId?: string | null;
      status: TransitionStatus;
      input?: unknown;
    };
    history: Array<{
      nodeId: string;
      input?: unknown;
    }>;
    stores: Record<string, unknown>;
  };
}

export type WorkflowExport = WorkflowExportBasic | WorkflowExportFull;

export interface WorkflowAPI<Creators extends readonly StepCreatorAny[]> {
  /**
   * Register steps to the workflow.
   * @param nodesArg The steps to register.
   */
  register(nodesArg: ReturnType<Creators[number]> | readonly ReturnType<Creators[number]>[]): void;
  /**
   * Connect two steps together.
   * @param from The step to transition out from.
   * @param to The step to transition into.
   * @param unidirectional Whether the connection is bidirectional or unidirectional. Defaults to bidirectional.
   */
  connect<Input, Output extends Input>(
    from: StepInstance<any, Output, any, any, any>,
    to: StepInstance<Input, any, any, any, any>,
    unidirectional?: boolean,
  ): void;
  /**
   * Connect two steps together using an edge.
   * @param edge The edge to connect.
   */
  connect<Input, Output>(edge: Edge<Input, Output>): void;
  /**
   * Start the workflow.
   */
  start<Input, Output, Config, Api extends StepAPI, Store>(node: StepInstance<Input, Output, Config, Api, Store>): void;
  /**
   * Get the current step.
   */
  getCurrentStep(): CurrentStep<Creators>;
  /**
   * Subscribe to the current step.
   * @param callback The callback to call when the current step changes.
   */
  subscribe(callback: (kind: string, name: string, status: TransitionStatus) => void): () => void;
  /**
   * Back to the previous step.
   */
  back(): void;
  /**
   * Export current workflow configuration or full state to JSON structure.
   * @param mode 'basic' for nodes/edges only; 'full' for including runtime state and history.
   */
  exportWorkflow(mode: 'basic' | 'full'): WorkflowExport;
  /**
   * Import workflow configuration or full state from JSON. Operation is atomic; on any error, no changes are applied.
   * @param data The JSON object to import.
   * @param mode Must match the export format: 'basic' or 'full'.
   */
  importWorkflow(data: WorkflowExport, mode: 'basic' | 'full'): void;
}
