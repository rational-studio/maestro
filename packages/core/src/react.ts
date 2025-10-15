import { useSyncExternalStore, useDebugValue } from 'react';

import { type StepCreatorAny } from './step/types';
import { type CurrentStep, type WorkflowAPI } from './workflow/types';

const getCurrentStepServerSide: () => CurrentStep<[]> = () => ({
  status: 'notStarted',
});

export function useWorkflow<const Creators extends readonly StepCreatorAny[]>({
  subscribe,
  getCurrentStep,
}: WorkflowAPI<Creators>) {
  const slice = useSyncExternalStore(subscribe, getCurrentStep, getCurrentStepServerSide);
  useDebugValue(slice);
  return slice;
}
