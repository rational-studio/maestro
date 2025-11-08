/**
 * WorkflowContext: internal lifecycle and subscription state for the current step.
 * This context is used by the core workflow logic to manage hooks, effects, and store subscriptions.
 */
import { type CleanupFn, type TransitionHook } from '../step/types';
import { type EffectEntry } from './effects';

export type WorkflowContext = {
  hasRunIn: boolean;
  inHooks: TransitionHook[];
  inCleanups: CleanupFn[];
  outHooks: TransitionHook[];
  /** Cleanups returned by transitionOut, executed upon back into this step */
  outCleanupOnBack: CleanupFn[];
  /** Effect registry with deps and cleanup */
  effects: EffectEntry[];
  /** Unsubscribe function for data layer (store) subscription */
  storeUnsub: () => void;
  /** Current input for this step */
  currentInput?: unknown;
  /** Version token to guard async resolutions against stale contexts */
  version: number;
};
