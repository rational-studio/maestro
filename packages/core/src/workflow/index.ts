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
import { type CurrentStep, type CurrentStepStarted, type TransitionStatus, type WorkflowAPI } from './types';

function safeInvokeCleanup(fn: CleanupFn) {
  if (typeof fn === 'function') {
    fn();
  }
}

function isPromise<T = unknown>(value: any): value is Promise<T> {
  return !!value && typeof value.then === 'function';
}

function handleAsyncError(err: unknown, phase: 'transitionIn' | 'transitionOut', hookIndex: number) {
  // Non-throwing error handling to preserve workflow continuity
  const msg = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.warn(`[motif-ts] ${phase} hook #${hookIndex} rejected: ${msg}`);
}

// React-like lifecycle context for the current step
type WorkflowContext = {
  hasRunIn: boolean;
  inHooks: TransitionHook[];
  inCleanups: CleanupFn[];
  outHooks: TransitionHook[];
  // cleanups returned by transitionOut, executed upon back into this step
  outCleanupOnBack: CleanupFn[];
  // effect registry with deps and cleanup
  effects: Array<{ deps?: DependencyList; run: () => CleanupFn; cleanup?: CleanupFn }>;
  // unsubscribe function for data layer (store) subscription
  storeUnsub?: () => void;
  // current input for this step
  currentInput?: any;
  // version token to guard async resolutions against stale contexts
  version: number;
};

function runOutCleanupOnBack(cleanups: CleanupFnArray) {
  for (const cleanup of cleanups) {
    safeInvokeCleanup(cleanup);
  }
  // Mark array as executed so late async cleanups resolve immediately
  cleanups[CLEANUP_ARRAY_EXECUTED] = true;
}

function shallowEqual(a?: DependencyList, b?: DependencyList): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (Object.is(a[i], b[i])) {
      continue;
    }
    return false;
  }
  return true;
}

function validateInventory(inventory: readonly StepCreatorAny[]) {
  const counts: Record<string, number> = {};
  for (const creator of inventory) {
    const k = creator.kind;
    counts[k] = (counts[k] ?? 0) + 1;
  }

  const dupDetails: string[] = [];
  for (const k in counts) {
    const c = counts[k];
    if (c > 1) {
      dupDetails.push(`${k} (${c}x)`);
    }
  }

  if (dupDetails.length) {
    const details = dupDetails.join(', ');
    throw new Error(
      `motif-ts Workflow Inventory contains duplicate Step kinds: ${details}. Each Step kind must be unique.`,
    );
  }
}

export function workflow<const Creators extends readonly StepCreatorAny[]>(inventory: Creators): WorkflowAPI<Creators> {
  const inventoryMap: Map<string, StepCreatorAny> = new Map();
  const nodes = new Set<StepInstance<any, any, any, any, any>>();
  const edges: Edge<any, any>[] = [];
  const history: Array<{
    node: StepInstance<any, any, any, any, any>;
    input: any;
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

  // Validate duplicate kinds with detailed error information
  validateInventory(inventory);

  for (const creator of inventory) {
    inventoryMap.set(creator.kind, creator);
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

  // Exit sequence: run transitionOut hooks (once, before exit), collect their cleanups to run when coming back.  134   const runExitSequence = (): CleanupFn[] => {
  // Also run effect cleanups and transitionIn cleanups immediately.
  const runExitSequence = (): CleanupFnArray => {
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
    const effectsDefs: Array<{ deps?: DependencyList; run: () => CleanupFn }> = [];

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
          history.push({ node, input: inputForNode, outCleanupOnBack: prevOutCleanups });
          return;
        }
        const nextNode = selected.to;
        let nextInput: any = undefined;
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
        storeUnsub: undefined,
        currentInput: inputForNode,
        version: ++contextVersionCounter,
      };
    } else {
      context.outHooks = outHooks;
    }

    // Effect diffing / rerun
    const prevEffects = context.effects;
    const nextEffects: Array<{ deps?: DependencyList; run: () => CleanupFn; cleanup?: CleanupFn }> = [];
    const max = Math.max(prevEffects.length, effectsDefs.length);
    for (let i = 0; i < max; i++) {
      const prev = prevEffects[i];
      const def = effectsDefs[i];
      if (!def) {
        if (prev && typeof prev.cleanup === 'function') {
          prev.cleanup();
        }
        continue;
      }
      const shouldRun = !def.deps ? true : def.deps.length === 0 ? !prev : !shallowEqual(prev?.deps, def.deps);
      if (shouldRun) {
        // cleanup previous first
        if (prev && typeof prev.cleanup === 'function') {
          prev.cleanup();
        }
        const cleanup = def.run();
        nextEffects[i] = { deps: def.deps, run: def.run, cleanup };
      } else {
        nextEffects[i] = { deps: def.deps, run: def.run, cleanup: prev?.cleanup };
      }
    }
    context.effects = nextEffects;

    currentApi = api;
    currentStep = {
      status: 'ready',
      kind: current.kind,
      name: current.name,
      state: currentApi,
    } as CurrentStepStarted<Creators>;
    // Notify ready on store-driven rebuild
    notify(node.kind, node.name, 'ready');
  };

  const transitionInto = <Input, Output, Config, Api extends StepAPI, Store>(
    node: StepInstance<Input, Output, Config, Api, Store>,
    input: Input,
    isBack: boolean,
    backCleanups: CleanupFn[],
  ) => {
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
    const effectsDefs: Array<{ deps?: DependencyList; run: () => CleanupFn }> = [];

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
      let nextInput: any = undefined;
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
      history.push({ node, input, outCleanupOnBack: prevOutCleanups });
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
    const nextEffects: Array<{ deps?: DependencyList; run: () => CleanupFn; cleanup?: CleanupFn }> = [];
    for (let i = 0; i < effectsDefs.length; i++) {
      const def = effectsDefs[i];
      const cleanup: CleanupFn = def.run();
      nextEffects[i] = { deps: def.deps, run: def.run, cleanup };
    }
    context.effects = nextEffects;

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

  const register = (nodesArg: ReturnType<Creators[number]> | readonly ReturnType<Creators[number]>[]): void => {
    const list = Array.isArray(nodesArg) ? nodesArg : [nodesArg];
    const allowed = Array.from(inventoryMap.keys()).join(', ');
    for (const node of list) {
      if (!inventoryMap.has(node.kind)) {
        throw new Error(
          `Cannot register StepInstance kind '${node.kind}'. Not listed in inventory. Allowed kinds: [${allowed}]`,
        );
      }
      nodes.add(node);
    }
  };

  const connect = <I, O>(
    fromOrEdge: StepInstance<any, O, any, any, any> | Edge<I, O>,
    to?: StepInstance<I, any, any, any, any>,
    unidirectional = false,
  ): void => {
    if (to) {
      const from = fromOrEdge as StepInstance<any, O, any, any, any>;
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
      const e = edge<any, any>(from, to, unidirectional);
      edges.push(e);
    } else {
      const e = fromOrEdge as Edge<I, O>;
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
  };

  const start = <I, O, C, Api extends StepAPI, Store>(node: StepInstance<I, O, C, Api, Store>) => {
    if (!inventoryMap.has(node.kind)) {
      const allowed = Array.from(inventoryMap.keys()).join(', ');
      throw new Error(
        `Cannot start on StepInstance kind '${node.kind}'. Not listed in inventory. Allowed kinds: [${allowed}]`,
      );
    }
    if (!nodes.has(node)) {
      throw new Error(`Cannot start on unregistered StepInstance '${node.id}'. Register the instance before starting.`);
    }
    transitionInto(node, undefined as I, false, []);
  };

  const getCurrentStep = () => currentStep;

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

  return {
    register,
    connect,
    start,
    getCurrentStep,
    subscribe,
    back,
  };
}
