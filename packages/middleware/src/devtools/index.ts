import { type StepCreatorAny, type WorkflowAPI } from '@motif-ts/core';

import type {} from '@redux-devtools/extension';

export default function devtoolsMiddleware<const Creators extends readonly StepCreatorAny[]>(
  workflow: WorkflowAPI<Creators>,
): WorkflowAPI<Creators> {
  const { __REDUX_DEVTOOLS_EXTENSION__ } = window;
  if (!__REDUX_DEVTOOLS_EXTENSION__) {
    return workflow;
  }
  const { register, connect, start, getCurrentStep, subscribe, back, INTERNAL } = workflow;
  return {
    register,
    connect,
    start,
    getCurrentStep,
    subscribe,
    back,
    INTERNAL,
  } satisfies WorkflowAPI<Creators>;
}
