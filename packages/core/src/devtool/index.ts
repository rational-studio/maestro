import '@redux-devtools/extension';

import { type StepCreatorAny } from '../step/types';
import { type WorkflowAPI } from '../workflow/types';

export default function devtoolsMiddleware<const Creators extends readonly StepCreatorAny[]>(
  workflow: WorkflowAPI<Creators>,
): WorkflowAPI<Creators> {
  const { __REDUX_DEVTOOLS_EXTENSION__ } = window;
  if (!__REDUX_DEVTOOLS_EXTENSION__) {
    return workflow;
  }
  return {
    register(...args) {
      return workflow.register(...args);
    },
    // @ts-expect-error
    connect(...args) {
      // @ts-expect-error
      return workflow.connect(...args);
    },
    start(edge) {
      return workflow.start(edge);
    },
    getCurrentStep() {
      return workflow.getCurrentStep();
    },
    subscribe(...args) {
      return workflow.subscribe(...args);
    },
    back() {
      return workflow.back();
    },
    exportWorkflow(...args) {
      // @ts-expect-error
      return workflow.exportWorkflow(...args);
    },
    importWorkflow(...args) {
      // @ts-expect-error
      return workflow.importWorkflow(...args);
    },
  } satisfies WorkflowAPI<Creators>;
}
