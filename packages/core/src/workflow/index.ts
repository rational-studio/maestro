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
import { type WorkflowContext } from './context';
import { computeNextEffects, initialEffects, type EffectDef } from './effects';
import { type CurrentStep, type CurrentStepStarted, type TransitionStatus, type WorkflowAPI } from './types';
import { handleAsyncError, isPromise, runOutCleanupOnBack, safeInvokeCleanup } from './utils';
import { validateInventory } from './validators';

export function workflow<const Creators extends readonly StepCreatorAny[]>(inventory: Creators): WorkflowAPI<Creators> {
  const stepInventoryMap: Map<string, StepCreatorAny> = new Map();
  const nodes = new Set<StepInstance<any, any, any, any, any>>();
  const edges: Edge<any, any>[] = [];
  const history: Array<{
    node: StepInstance<any, any, any, any, any>;
    input: unknown;
    output: unknown;
    // transitionOut cleanups to be executed when user navigates back to this step
    outCleanupOnBack: CleanupFn[];
  }> = [];
  const subscribers = new Set<(kind: string, name: string, status: TransitionStatus) => void>();

  // States
  let currentStep: CurrentStep<Creators> = { status: 'notStarted' };
  let current: StepInstance<any, any, any, any, any> | undefined;
  let currentApi: StepAPI | undefined;
  let context: WorkflowContext | undefined;
  let contextVersionCounter = 0;
  let isLifeCyclePaused = false;

  // Validate duplicate kinds with detailed error information
  validateInventory(inventory);

  for (const creator of inventory) {
    stepInventoryMap.set(creator.kind, creator);
  }

  Object.freeze(inventory);

  const subscribe = (handler: (kind: string, name: string, status: TransitionStatus) => void) => {
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  };

  const notify = (kind: string, name: string, status: TransitionStatus) => {
    for (const cb of subscribers) {
      cb(kind, name, status);
    }
  };

  const runTransitionInOnce = () => {
    if (!context || context.hasRunIn) {
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
    if (isLifeCyclePaused) {
      return [];
    }
    const outCleanupsForBack: CleanupFnArray = [];
    // mark as not yet executed; used to flush late async cleanups
    outCleanupsForBack[CLEANUP_ARRAY_EXECUTED] = false;
    if (current) {
      currentStep = {
        status: 'transitionOut',
        kind: current.kind,
        name: current.name,
        state: currentApi,
      } as CurrentStepStarted<Creators>;
      notify(current.kind, current.name, 'transitionOut');
    }
    if (context) {
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
      for (const eff of context.effects) {
        if (typeof eff.cleanup === 'function') {
          eff.cleanup();
        }
      }
      for (const cleanup of context.inCleanups) {
        safeInvokeCleanup(cleanup);
      }
      context.storeUnsub?.();
      context = undefined;
    }
    return outCleanupsForBack;
  };

  const rebuildCurrent = () => {
    if (!current) {
      return;
    }
    const node = current;
    const inputForNode = context?.currentInput;

    const inHooks: TransitionHook[] = [];
    const outHooks: TransitionHook[] = [];
    const effectsDefs: EffectDef[] = [];

    const args: BuildArgs<any, any, any, any> = {
      name: node.name,
      transitionIn: (hook) => {
        if (!context?.hasRunIn) {
          inHooks.push(hook);
        }
      },
      transitionOut: (hook) => {
        outHooks.push(hook);
      },
      effect: (fn, deps) => {
        effectsDefs.push({ run: fn, deps });
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
          history.push({ node, input: inputForNode, output: validatedOutput, outCleanupOnBack: prevOutCleanups });
          return;
        }
        const nextNode = selected.to;
        let nextInput = undefined;
        if (nextNode.inputSchema) {
          nextInput = nextNode.inputSchema.parse(validatedOutput);
        }
        const prevOutCleanups = runExitSequence();
        history.push({ node, input: inputForNode, output: validatedOutput, outCleanupOnBack: prevOutCleanups });
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
        storeUnsub: undefined,
        currentInput: inputForNode,
        version: ++contextVersionCounter,
      };
    } else {
      context.outHooks = outHooks;
    }

    // Effect diffing / rerun
    if (!isLifeCyclePaused) {
      context.effects = computeNextEffects(context.effects, effectsDefs);
    }

    currentApi = api;
    currentStep = {
      status: 'ready',
      kind: current.kind,
      name: current.name,
      state: currentApi,
    } as CurrentStepStarted<Creators>;

    if(!isLifeCyclePaused) {
    // Notify ready on store-driven rebuild
    notify(node.kind, node.name, 'ready');
    }
  };

  const transitionInto = <Input, Output, Config, Api extends StepAPI, Store>(
    node: StepInstance<Input, Output, Config, Api, Store>,
    input: Input,
    isBack: boolean,
    backCleanups: CleanupFn[],
  ) => {
    if (isLifeCyclePaused) {
      return;
    }
    // Do NOT run exit sequence here; it is handled by callers (next/back)
    current = node;
    currentStep = {
      status: 'transitionIn',
      kind: current.kind,
      name: current.name,
      state: currentApi,
    } as CurrentStepStarted<Creators>;
    // Notify transition entering
    notify(node.kind, node.name, 'transitionIn');

    if (isBack) {
      // execute transitionOut cleanups of the step we are returning to
      // even if none are present yet; late async cleanups will flush immediately
      runOutCleanupOnBack(backCleanups);
    }

    const inHooks: TransitionHook[] = [];
    const outHooks: TransitionHook[] = [];
    const effectsDefs: EffectDef[] = [];

    const next = (output: Output) => {
      const validatedOutput = node.outputSchema ? node.outputSchema.parse(output) : undefined;
      const outgoing = edges.filter((e) => e.from === node);
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
      history.push({ node, input, output: validatedOutput, outCleanupOnBack: prevOutCleanups });
      transitionInto(nextNode, nextInput, false, []);
    };

    const args: any = {
      name: node.name,
      transitionIn: (hook: TransitionHook) => inHooks.push(hook),
      transitionOut: (hook: TransitionHook) => outHooks.push(hook),
      effect: (fn: () => CleanupFn, deps?: DependencyList) => effectsDefs.push({ run: fn, deps }),
      input,
      ...(node.configSchema ? { config: node.config } : {}),
      ...(node.storeApi ? { store: node.storeApi.getState() } : {}),
      next,
    };
    const api = node.build(args);

    // Initialize context for this step
    context = {
      hasRunIn: false,
      inHooks,
      inCleanups: [],
      outHooks,
      outCleanupOnBack: [],
      effects: [],
      storeUnsub: undefined,
      currentInput: input,
      version: ++contextVersionCounter,
    };
    // Execute transitionIn once
    runTransitionInOnce();

    // Run initial effects (first render)
    context.effects = initialEffects(effectsDefs);

    // Subscribe to data layer changes to rebuild on any change

    if (node.storeApi) {
      context.storeUnsub = node.storeApi.subscribe(() => {
        rebuildCurrent();
      });
    }

    currentApi = api;
    currentStep = {
      status: 'ready' as const,
      kind: current.kind,
      name: current.name,
      state: currentApi,
    } as CurrentStepStarted<Creators>;
    notify(node.kind, node.name, 'ready');
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

  const getCurrentStep = () => currentStep;
  const getCurrentNode = () => current;
  const getContext = () => context;
  const setNotStarted = () => {
    current = undefined;
    currentApi = undefined;
    context = undefined;
    currentStep = { status: 'notStarted' };
  };

  const back = () => {
    const prev = history.pop();
    if (!prev) {
      return;
    }
    const connecting = edges.find((e) => e.from === prev.node && e.to === current);
    // Enforce edge reversibility: find the edge previously used to reach current from prev
    if (connecting && connecting.unidirectional) {
      throw new Error(
        `Back navigation is not allowed: edge from '${prev.node.id}' to '${current?.id}' is unidirectional`,
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
    INTERNAL: {
      nodes,
      edges,
      history,
      stepInventoryMap,
      getCurrentNode,
      getContext,
      setNotStarted,
      runExitSequence,
      transitionInto,
      notify,
      pauseLifeCycle: () => {
        isLifeCyclePaused = true;
        // cleanup existing effects
        if (context) {
          for (const eff of context.effects) {
            if (typeof eff.cleanup === 'function') {
              eff.cleanup();
            }
          }
          context.effects = [];
        }
      },
      resumeLifeCycle: () => {
        isLifeCyclePaused = false;
      },
    },
  };

  return workflowApis;
}
