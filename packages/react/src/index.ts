import { type StepCreatorAny, type WorkflowAPI } from '@motif-ts/core';
import { useDebugValue, useSyncExternalStore } from 'react';

export function useWorkflow<const Creators extends readonly StepCreatorAny[]>({
  subscribe,
  getCurrentStep,
}: WorkflowAPI<Creators>) {
  return useSyncExternalStore(subscribe, getCurrentStep);
}
