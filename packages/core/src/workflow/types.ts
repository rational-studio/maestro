import { type Edge } from '../edge/type';
import {
  type CleanupFn,
  type CleanupFnArray,
  type StepAPI,
  type StepCreatorAny,
  type StepInstance,
} from '../step/types';
import { type WorkflowContext } from './context';

export type TransitionStatus = 'transitionIn' | 'ready' | 'transitionOut';

/**
 * @internal
 */
export type PrivateCurrentStepStatus<Creators extends readonly StepCreatorAny[]> = {
  status: TransitionStatus;
} & {
  [K in Creators[number]['kind']]: {
    api: ReturnType<
      ReturnType<
        Extract<
          Creators[number],
          {
            kind: K;
          }
        >
      >['build']
    >;
    instance: ReturnType<Extract<
          Creators[number],
          {
            kind: K;
          }
        >>;
  };
}[Creators[number]['kind']];

export type CurrentStepStatus<Creators extends readonly StepCreatorAny[]> = {
  status: TransitionStatus;
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
  connect(edge: Edge<any, any>): WorkflowAPI<Creators>;
  /**
   * Start the workflow.
   */
  start<Input, Output, Config, Api extends StepAPI, Store>(
    node: StepInstance<Input, Output, Config, Api, Store>,
  ): WorkflowAPI<Creators>;
  /**
   * Get the current step.
   */
  getCurrentStep(): CurrentStepStatus<Creators>;
  /**
   * Subscribe to the current step.
   * @param callback The callback to call when the current step changes.
   */
  subscribe(callback: (currentStep: CurrentStepStatus<Creators>) => void): () => void;
  /**
   * Back to the previous step.
   */
  back(): void;
  $$INTERNAL: {
    nodes: Set<StepInstance<any, any, any, any, any>>;
    edges: Edge<any, any>[];
    history: {
      node: StepInstance<any, any, any, any, any>;
      input: unknown;
      outCleanupOnBack: CleanupFn[];
    }[];
    stepInventoryMap: Map<string, StepCreatorAny>;
    getCurrentNode: () => StepInstance<any, any, any, any, any>;
    getContext: () => WorkflowContext;
    runExitSequence: () => CleanupFnArray;
    transitionInto: (
      node: StepInstance<any, any, any, any, any>,
      input: any,
      isBack: boolean,
      backCleanups: CleanupFn[],
    ) => void;
    stop: () => void;
    setCurrentStep: (currentStep: PrivateCurrentStepStatus<Creators>) => void;
    isLifeCyclePaused: () => boolean;
    pauseLifeCycle: () => void;
    resumeLifeCycle: () => void;
  };
}
