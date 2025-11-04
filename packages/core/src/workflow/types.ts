import type z from 'zod/v4';

import { type EdgeInstance } from '../edge/type';
import { type StepAPI, type StepCreatorAny, type StepInstance } from '../step/types';
import { type SchemaBasic, type SchemaFullState } from './constants';

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

export interface WorkflowAPI<Creators extends readonly StepCreatorAny[]> {
  /**
   * Register steps to the workflow.
   * @param nodesArg The steps to register.
   */
  register(nodesArg: ReturnType<Creators[number]> | readonly ReturnType<Creators[number]>[]): WorkflowAPI<Creators>;
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
  ): WorkflowAPI<Creators>;
  /**
   * Connect two steps together using an edge.
   * @param edge The edge to connect.
   */
  connect<Input, Output>(edge: EdgeInstance<Input, Output>): WorkflowAPI<Creators>;
  /**
   * Start the workflow.
   */
  start<Input, Output, Config, Api extends StepAPI, Store>(
    node: StepInstance<Input, Output, Config, Api, Store>,
  ): WorkflowAPI<Creators>;
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
