import { type StepCreatorAny, type WorkflowAPI } from '@motif-ts/core';

import type {} from '@redux-devtools/extension';

export type DevtoolsOptions = {
  name?: string;
};

const findCallerName = (stack: string | undefined) => {
  if (!stack) {
    return undefined;
  }
  const traceLines = stack.split('\n');
  const apiSetStateLineIndex = traceLines.findIndex((traceLine) => traceLine.includes('setState'));
  if (apiSetStateLineIndex < 0) {
    return undefined;
  }
  const callerLine = traceLines[apiSetStateLineIndex + 1]?.trim() || '';
  return /.+ (.+) .+/.exec(callerLine)?.[1];
};

export default function devtoolsMiddleware<const Creators extends readonly StepCreatorAny[]>(
  workflow: WorkflowAPI<Creators>,
  options: DevtoolsOptions = {},
): WorkflowAPI<Creators> {
  const {
    getCurrentStep,
    subscribe,
    $$INTERNAL: { nodes, getContext, getCurrentNode, history, transitionInto },
  } = workflow;

  const { name } = options;
  const { __REDUX_DEVTOOLS_EXTENSION__: ext } = window;

  if (!ext) {
    // Extension not available: return original workflow unchanged
    return workflow;
  }

  const devtools = ext.connect({ name: name ?? 'motif workflow' });

  type Snapshot = ReturnType<typeof buildSnapshot>;

  function buildSnapshot() {
    return getCurrentStep();
  }

  function recordAndSend(type: string) {
    const state = buildSnapshot();
    const stack = new Error().stack;
    const callerName = findCallerName(stack);
    devtools.send({ type: `[motif] ${type} ${callerName || ''}` }, state);
  }

  function restoreFromSnapshot(snap: Snapshot | any) {
    const nodesById = new Map(Array.from(nodes).map((n) => [n.id, n] as const));
    const targetId: string | undefined = snap?.currentNodeId;
    const targetNode = targetId ? nodesById.get(targetId) : undefined;

    // reset runtime state
    // INTERNAL.pauseLifeCycle();

    // restore store states
    if (snap.stores) {
      for (const node of nodes) {
        if (node.storeApi && snap.stores[node.id]) {
          node.storeApi.setState(snap.stores[node.id]);
        }
      }
    }

    // rebuild history stack
    history.length = 0;
    const hist = Array.isArray(snap?.history) ? snap.history : [];
    for (const h of hist) {
      const n = nodesById.get(h.nodeId);
      if (n) {
        history.push({ node: n, input: h.input, output: h.output, outCleanupOnBack: [] } as any);
      }
    }

    // transition into target node
    if (targetNode) {
      transitionInto(targetNode, snap?.currentInput, false, []);
    }
  }

  // Initialize devtools with first snapshot
  devtools.init(buildSnapshot());

  // Monitor connection status and handle time-travel commands
  // @ts-expect-error
  devtools.subscribe((message: any) => {
    console.log('devtools message', message);
    if (message?.type === 'START') {
      recordAndSend('DEVTOOLS_MONITOR_START');
      return;
    }
    if (message?.type === 'STOP') {
      recordAndSend('DEVTOOLS_MONITOR_STOP');
      return;
    }
    if (message?.type === 'DISPATCH') {
      const payloadType = message?.payload?.type;
      switch (payloadType) {
        case 'JUMP_TO_STATE': {
          // state is a stringified snapshot
          const next = message?.state;
          if (typeof next === 'string') {
            try {
              const parsed = JSON.parse(next);
              restoreFromSnapshot(parsed);
            } catch {
              // ignore invalid state
            }
          }
          break;
        }
        case 'JUMP_TO_ACTION': {
          const index =
            typeof message?.payload?.actionId === 'number'
              ? message.payload.actionId
              : typeof message?.payload?.index === 'number'
                ? message.payload.index
                : typeof message?.payload?.actionIndex === 'number'
                  ? message.payload.actionIndex
                  : -1;
          if (index >= 0 && index < actions.length) {
            restoreFromSnapshot(actions[index].state);
          }
          break;
        }
        case 'COMMIT': {
          devtools.init(buildSnapshot());
          break;
        }
        case 'ROLLBACK': {
          // if (first) {
          //   restoreFromSnapshot(first);
          // }
          break;
        }
        case 'IMPORT_STATE': {
          const computedStates = message?.payload?.nextLiftedState?.computedStates;
          const idx = message?.payload?.nextLiftedState?.currentStateIndex;
          const s = Array.isArray(computedStates) && typeof idx === 'number' ? computedStates[idx]?.state : undefined;
          if (s) {
            restoreFromSnapshot(s);
          }
          break;
        }
        default:
          break;
      }
    }
  });

  // Track runtime status changes
  subscribe((currentStep) => {
    if (currentStep.kind === '@@ReduxDevTool') {
      return;
    }
    const type =
      currentStep.status === 'transitionIn'
        ? 'TRANSITION_IN'
        : currentStep.status === 'ready'
          ? 'READY'
          : 'TRANSITION_OUT';
    recordAndSend(type);
  });

  return {
    ...workflow,
    back() {
      workflow.back();
      recordAndSend('BACK');
    },
  };
}
