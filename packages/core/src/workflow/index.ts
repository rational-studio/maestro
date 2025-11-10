import { edge } from '../edge';
import { type Edge } from '../edge/type';
import { CLEANUP_ARRAY_EXECUTED } from '../step/constants';
import {
  type BuildArgs,
  type CleanupFn,
  type CleanupFnArray,
  type DependencyList,
  type StepAPI,
  type StepCreatorAny,
  type StepInstance,
  type TransitionHook,
} from '../step/types';
import { _ASSERT } from '../utils';
import { type WorkflowContext } from './context';
import { processEffects, type EffectDef } from './effects';
import { type CurrentStepStatus, type PrivateCurrentStepStatus, type WorkflowAPI } from './types';
import { handleAsyncError, isPromise, runOutCleanupOnBack, safeInvokeCleanup } from './utils';
import { validateInventory } from './validators';

const noop = () => void 0;

function convertToPublicCurrentStepStatus<Creators extends readonly StepCreatorAny[]>(currentStep: PrivateCurrentStepStatus<Creators>): CurrentStepStatus<Creators> {
  return {
      status: currentStep.status,
      kind: currentStep.instance.kind,
      name: currentStep.instance.name,
      state: currentStep.api
    };
}

export function workflow<const Creators extends readonly StepCreatorAny[]>(inventory: Creators): WorkflowAPI<Creators> {
  // #region No need to be serialized for time-traveling
  const stepInventoryMap: Map<string, StepCreatorAny> = new Map();
  const nodes = new Set<StepInstance<any, any, any, any, any>>();
  const edges: Edge<any, any>[] = [];
  const subscribers = new Set<(currentStep: CurrentStepStatus<Creators>) => void>();
  const history: Array<{
    node: StepInstance<any, any, any, any, any>;
    input: unknown;
    // transitionOut cleanups to be executed when user navigates back to this step
    outCleanupOnBack: CleanupFn[];
  }> = [];
  let context: WorkflowContext | undefined;
  let contextVersionCounter = 0;
  let isLifeCyclePaused = false;
  //#endregion

  // #region States, need to be serialized for time-traveling
  let currentStep: PrivateCurrentStepStatus<Creators> | undefined;
  // #endregion

  // Validate duplicate kinds with detailed error information
  validateInventory(inventory);

  for (const creator of inventory) {
    stepInventoryMap.set(creator.kind, creator);
  }

  Object.freeze(inventory);

  const subscribe = (handler: (currentStep: CurrentStepStatus<Creators>) => void) => {
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  };

  const notify = (currentStep: PrivateCurrentStepStatus<Creators>) => {
    for (const cb of subscribers) {
      cb(convertToPublicCurrentStepStatus(currentStep));
    }
  };

  const setCurrentStep = (currentStepStatus: PrivateCurrentStepStatus<Creators>) => {
    currentStep = currentStepStatus;
    notify(currentStep);
  };

  const runTransitionInOnce = () => {
    if (!context || context.hasRunIn) {
      return;
    }
    if (isLifeCyclePaused) {
      return;
    }
    context.inCleanups = [];
    const version = context.version;
    for (let i = 0; i < context.inHooks.length; i++) {
      const hook = context.inHooks[i];
      const result = hook();
      if (typeof result === 'function') {
        context.inCleanups.push(result);
      } else if (isPromise<CleanupFn>(result)) {
        result
          .then((cleanup) => {
            if (typeof cleanup !== 'function') {
              return;
            }
            // If context is still current, register; otherwise, invoke immediately
            if (context && context.version === version) {
              context.inCleanups.push(cleanup);
            } else {
              safeInvokeCleanup(cleanup);
            }
          })
          .catch((err) => handleAsyncError(err, 'transitionIn', i));
      }
    }
    context.hasRunIn = true;
  };

  // Exit sequence: run transitionOut hooks (once, before exit), collect their cleanups to run when coming back.
  // Also run effect cleanups and transitionIn cleanups immediately.
  const runExitSequence = (): CleanupFnArray => {
    const outCleanupsForBack: CleanupFnArray = [];
    // mark as not yet executed; used to flush late async cleanups
    outCleanupsForBack[CLEANUP_ARRAY_EXECUTED] = false;
    if (currentStep ) {
      _ASSERT(currentStep.status === 'ready', 'currentStep.status must be ready');
      _ASSERT(currentStep.instance.name === currentStep.instance.name, 'currentStep.stepCreator.name must be currentStep.stepCreator.name');
      setCurrentStep({
        ...currentStep,
        status: 'transitionOut',
      });
    }
    if (context) {
      if (!isLifeCyclePaused) {
        for (let i = 0; i < context.outHooks.length; i++) {
          const hook = context.outHooks[i];
          const result = hook();
          if (typeof result === 'function') {
            outCleanupsForBack.push(result);
          } else if (isPromise<CleanupFn>(result)) {
            result
              .then((cleanup) => {
                if (typeof cleanup !== 'function') {
                  return;
                }
                // If back has already executed for this array, invoke immediately; else collect
                const executed = outCleanupsForBack[CLEANUP_ARRAY_EXECUTED] === true;
                if (executed) {
                  safeInvokeCleanup(cleanup);
                } else {
                  outCleanupsForBack.push(cleanup);
                }
              })
              .catch((err) => handleAsyncError(err, 'transitionOut', i));
          }
        }
      }
      for (const eff of context.effects) {
        if (typeof eff.cleanup === 'function') {
          eff.cleanup();
        }
      }
      for (const cleanup of context.inCleanups) {
        safeInvokeCleanup(cleanup);
      }
      context.storeUnsub();
      context = undefined;
    }
    return outCleanupsForBack;
  };

  const rebuildCurrent = () => {
    if (!currentStep) {
      return;
    }
    const node = currentStep.instance;
    const inputForNode = context?.currentInput;

    const inHooks: TransitionHook[] = [];
    const outHooks: TransitionHook[] = [];
    const effectsDefs: EffectDef[] = [];

    const args: BuildArgs<any, any, any, any> = {
      name: node.name,
      transitionIn: (hook) => {
        if (!context?.hasRunIn && !isLifeCyclePaused) {
          inHooks.push(hook);
        }
      },
      transitionOut: (hook) => {
        if (!isLifeCyclePaused) {
          outHooks.push(hook);
        }
      },
      effect: (fn, deps) => {
        if (!isLifeCyclePaused) {
          effectsDefs.push({ run: fn, deps });
        }
      },
      input: inputForNode,
      ...(node.configSchema ? { config: node.config } : {}),
      ...(node.storeApi ? { store: node.storeApi.getState() } : {}),
      next: (output) => {
        const validatedOutput = node.outputSchema ? node.outputSchema.parse(output) : undefined;
        const outgoing = edges.filter((e) => e.from === node);
        const selected: Edge<any, any> | undefined = outgoing[0];
        if (!selected) {
          const prevOutCleanups = runExitSequence();
          history.push({ node, input: inputForNode, outCleanupOnBack: prevOutCleanups });
          return;
        }
        const nextNode = selected.to;
        let nextInput = undefined;
        if (nextNode.inputSchema) {
          nextInput = nextNode.inputSchema.parse(validatedOutput);
        }
        const prevOutCleanups = runExitSequence();
        history.push({ node, input: inputForNode, outCleanupOnBack: prevOutCleanups });
        transitionInto(nextNode, nextInput, false, []);
      },
    };
    const api = node.build(args);

    // Update outHooks to latest
    if (!context) {
      context = {
        hasRunIn: true,
        inHooks,
        inCleanups: [],
        outHooks,
        outCleanupOnBack: [],
        effects: [],
        storeUnsub: noop,
        currentInput: inputForNode,
        version: ++contextVersionCounter,
      };
    } else {
      context.outHooks = outHooks;
    }

    // Effect diffing / rerun
    context.effects = processEffects(effectsDefs, context.effects);

    setCurrentStep({
      status: 'ready',
      instance: currentStep.instance,
      api,
    });
  };

  const transitionInto = <Input, Output, Config, Api extends StepAPI, Store>(
    stepInstance: StepInstance<Input, Output, Config, Api, Store>,
    input: Input,
    isBack: boolean,
    backCleanups: CleanupFn[],
  ) => {
    if (isBack) {
      // execute transitionOut cleanups of the step we are returning to
      // even if none are present yet; late async cleanups will flush immediately
      runOutCleanupOnBack(backCleanups);
    }

    const inHooks: TransitionHook[] = [];
    const outHooks: TransitionHook[] = [];
    const effectsDefs: EffectDef[] = [];

    const next = (output: Output) => {
      const validatedOutput = stepInstance.outputSchema ? stepInstance.outputSchema.parse(output) : undefined;
      const outgoing = edges.filter((e) => e.from === stepInstance);
      // If there are no outgoing edges, end the workflow
      if (outgoing.length === 0) {
        runExitSequence();
        throw new Error('No next step');
      }
      // Try each outgoing edge and pick the first that allows transition
      let selectedEdge: Edge<Output, any> | undefined;
      let nextInput = undefined;
      for (const e of outgoing) {
        const res = e.validateTransition(validatedOutput);
        if (res.allow) {
          selectedEdge = e as Edge<Output, any>;
          nextInput = res.nextInput;
          break;
        }
      }
      if (!selectedEdge) {
        runExitSequence();
        throw new Error('Transition blocked by edge condition');
      }
      const nextNode = selectedEdge.to;
      if (nextNode.inputSchema) {
        nextInput = nextNode.inputSchema.parse(nextInput);
      }
      const prevOutCleanups = runExitSequence();
      history.push({ node: stepInstance, input, outCleanupOnBack: prevOutCleanups });
      transitionInto(nextNode, nextInput, false, []);
    };

    const args: any = {
      name: stepInstance.name,
      transitionIn: (hook: TransitionHook) => inHooks.push(hook),
      transitionOut: (hook: TransitionHook) => outHooks.push(hook),
      effect: (fn: () => CleanupFn, deps?: DependencyList) => effectsDefs.push({ run: fn, deps }),
      input,
      ...(stepInstance.configSchema ? { config: stepInstance.config } : {}),
      ...(stepInstance.storeApi ? { store: stepInstance.storeApi.getState() } : {}),
      next,
    };
    const api = stepInstance.build(args);

    setCurrentStep({
      status: 'transitionIn',
      instance: stepInstance,
      api: api,
    } as PrivateCurrentStepStatus<Creators>);

    // Initialize context for this step
    context = {
      hasRunIn: false,
      inHooks,
      inCleanups: [],
      outHooks,
      outCleanupOnBack: [],
      effects: [],
      storeUnsub: noop,
      currentInput: input,
      version: ++contextVersionCounter,
    };
    // Execute transitionIn once
    runTransitionInOnce();

    // Run initial effects (first render)
    context.effects = processEffects(effectsDefs);

    // Subscribe to data layer changes to rebuild on any change

    context.storeUnsub = stepInstance.storeApi
      ? stepInstance.storeApi.subscribe(() => {
          rebuildCurrent();
        })
      : noop;

    _ASSERT(currentStep?.status === 'transitionIn', 'currentStep.status must be transitionIn');
    setCurrentStep({
      ...currentStep,
      status: 'ready',
    });
  };

  const register = (nodesArg: ReturnType<Creators[number]> | readonly ReturnType<Creators[number]>[]) => {
    const list = Array.isArray(nodesArg) ? nodesArg : [nodesArg];
    const allowed = Array.from(stepInventoryMap.keys()).join(', ');
    for (const node of list) {
      if (!stepInventoryMap.has(node.kind)) {
        throw new Error(
          `Cannot register StepInstance kind '${node.kind}'. Not listed in inventory. Allowed kinds: [${allowed}]`,
        );
      }
      nodes.add(node);
    }
    return workflowApis;
  };

  const connect = <SI, SO extends SI, EI, EO>(
    fromOrEdge: StepInstance<any, SO, any, any, any> | Edge<EI, EO>,
    to?: StepInstance<SI, any, any, any, any>,
    unidirectional = false,
  ) => {
    if (to) {
      const from = fromOrEdge as StepInstance<any, SO, any, any, any>;
      if (!nodes.has(from)) {
        throw new Error(
          `Cannot connect from unregistered StepInstance '${from.id}'. Register the instance before connecting.`,
        );
      }
      if (!nodes.has(to)) {
        throw new Error(
          `Cannot connect to unregistered StepInstance '${to.id}'. Register the instance before connecting.`,
        );
      }
      const e = edge(from, to, unidirectional);
      edges.push(e);
    } else {
      const e = fromOrEdge as Edge<EI, EO>;
      if (!nodes.has(e.from)) {
        throw new Error(
          `Cannot connect from unregistered StepInstance '${e.from.id}'. Register the instance before connecting.`,
        );
      }
      if (!nodes.has(e.to)) {
        throw new Error(
          `Cannot connect to unregistered StepInstance '${e.to.id}'. Register the instance before connecting.`,
        );
      }
      edges.push(e);
    }
    return workflowApis;
  };

  const start = <I, O, C, Api extends StepAPI, Store>(node: StepInstance<I, O, C, Api, Store>) => {
    if (!nodes.has(node)) {
      throw new Error(`Cannot start on unregistered StepInstance '${node.id}'. Register the instance before starting.`);
    }
    transitionInto(node, undefined as I, false, []);
    return workflowApis;
  };

  const getCurrentStep = ():CurrentStepStatus<Creators> => {
    _ASSERT(currentStep !== undefined, 'currentStep must be defined');
    return convertToPublicCurrentStepStatus(currentStep);
  };

  const getCurrentNode = () => {
    _ASSERT(currentStep !== undefined, 'currentStep must be defined');
    return currentStep.instance;
  };

  const getContext = () => {
    _ASSERT(context !== undefined, 'context must be defined');
    return context;
  };

  const getIsLifeCyclePaused = () => {
    return isLifeCyclePaused;
  };

  const pauseLifeCycle = () => {
    if (isLifeCyclePaused) {
      return;
    }
    isLifeCyclePaused = true;
    if (context) {
      for (const eff of context.effects) {
        if (typeof eff.cleanup === 'function') {
          eff.cleanup();
        }
      }
      context.storeUnsub();
      // Clear effects to prevent re-running them on resume
      context.effects = [];
      context.storeUnsub = noop;
    }
  };

  const resumeLifeCycle = () => {
    if (!isLifeCyclePaused) {
      return;
    }
    isLifeCyclePaused = false;
    if (context && currentStep) {
      context.storeUnsub = currentStep.instance.storeApi
        ? currentStep.instance.storeApi.subscribe(() => {
            rebuildCurrent();
          })
        : noop;
    }
    rebuildCurrent();
  };

  const stop = () => {
    context = undefined;
    currentStep = undefined;
  };

  const back = () => {
    const prev = history.pop();
    if (!prev ) {
      return;
    }
    const connecting = edges.find((e) => e.from === prev.node && e.to === currentStep?.instance);
    // Enforce edge reversibility: find the edge previously used to reach current from prev
    if (connecting && connecting.unidirectional) {
      throw new Error(
        `Back navigation is not allowed: edge from '${prev.node.id}' to '${currentStep?.instance?.id}' is unidirectional`,
      );
    }
    // Run exit sequence for the current step (we are leaving it)
    runExitSequence();
    // When backing into prev.node, run its transitionOut cleanup collected at its previous exit
    transitionInto(prev.node, prev.input, true, prev.outCleanupOnBack);
  };

  const workflowApis = {
    register,
    connect,
    start,
    getCurrentStep,
    subscribe,
    back,
    // For Internal Use
    $$INTERNAL: {
      nodes,
      edges,
      history,
      stepInventoryMap,
      getCurrentNode,
      getContext,
      runExitSequence,
      transitionInto,
      setCurrentStep,
      stop,
      isLifeCyclePaused: getIsLifeCyclePaused,
      pauseLifeCycle,
      resumeLifeCycle,
    },
  };

  return workflowApis;
}
