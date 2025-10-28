import { type CurrentStep, type StepCreatorAny, type WorkflowAPI } from '@motif-ts/core';
import { useDebugValue, useSyncExternalStore } from 'react';

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
