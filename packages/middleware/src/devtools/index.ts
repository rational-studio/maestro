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
    $$INTERNAL: { nodes, transitionInto, getCurrentNode, getContext, pauseLifeCycle },
  } = workflow;

  const { name } = options;
  const { __REDUX_DEVTOOLS_EXTENSION__: ext } = window;

  if (!ext) {
    // Extension not available: return original workflow unchanged
    return workflow;
  }

  const devtools = ext.connect({ name: name ?? 'motif workflow' });

  type DevtoolsSnapshot = {
    currentStatus: string;
    currentNodeId: string;
    currentInput: unknown;
    currentState: Record<string, unknown> | undefined;
  };

  function recordAndSend(type: string) {
    const state = buildSnapshot();
    const stack = new Error().stack;
    const callerName = findCallerName(stack);
    devtools.send({ type: `[motif] ${type} ${callerName || ''}` }, state);
  }

  function buildSnapshot(): DevtoolsSnapshot {
    const currentNode = getCurrentNode();
    const current = getCurrentStep();
    const context = getContext();
    return {
      currentStatus: current.status,
      currentNodeId: currentNode.id,
      currentInput: context?.currentInput,
      currentState: currentNode.storeApi?.getState(),
    };
  }

  function restoreFromSnapshot({ currentNodeId, currentInput, currentState }: DevtoolsSnapshot) {
    const nodesById = new Map(Array.from(nodes).map((n) => [n.id, n] as const));
    const targetNode = nodesById.get(currentNodeId);
    // transition into target node
    if (targetNode) {
      if (currentState && targetNode.storeApi) {
        targetNode.storeApi.setState(currentState);
      }
      transitionInto(targetNode, currentInput, false, []);
    }
  }

  // Initialize devtools with first snapshot (safe even when not started)
  devtools.init(buildSnapshot());

  // Monitor connection status and handle time-travel commands
  // @ts-expect-error
  devtools.subscribe((message: any) => {
    if (message.type === 'START') {
      recordAndSend('DEVTOOLS_MONITOR_START');
      return;
    }
    if (message.type === 'STOP') {
      recordAndSend('DEVTOOLS_MONITOR_STOP');
      return;
    }
    if (message.type === 'DISPATCH') {
      const payloadType = message.payload.type;
      switch (payloadType) {
        case 'JUMP_TO_STATE': {
          // state is a stringified snapshot
          const next = message.state;
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
          pauseLifeCycle();
          if (typeof message.state === 'string') {
            const parsed = JSON.parse(message.state) as DevtoolsSnapshot;
            restoreFromSnapshot(parsed);
          }
          break;
        }
        case 'COMMIT': {
          devtools.init(buildSnapshot());
          break;
        }
        case 'ROLLBACK': {
          const next = message.state;
          if (typeof next === 'string') {
            const parsed = JSON.parse(next) as DevtoolsSnapshot;
            restoreFromSnapshot(parsed);
          }
          break;
        }
        case 'IMPORT_STATE': {
          const computedStates = message.payload.nextLiftedState.computedStates;
          const idx = message.payload.nextLiftedState.currentStateIndex;
          const s = Array.isArray(computedStates) && typeof idx === 'number' ? computedStates[idx].state : undefined;
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
  subscribe((currentStep, isWorkflowRunning) => {
    if (!isWorkflowRunning) {
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
