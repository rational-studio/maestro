/**
 * General-purpose utilities for the workflow module.
 * Contains helper functions for cleanup invocation, async checks, error handling,
 * back-navigation cleanup execution, and shallow dependency equality.
 */
import { CLEANUP_ARRAY_EXECUTED } from '../step/constants';
import { type CleanupFn, type CleanupFnArray, type DependencyList } from '../step/types';
import { LOG_PREFIX } from './constants';

/** Safely invoke a cleanup function if provided. */
export function safeInvokeCleanup(fn: CleanupFn) {
  if (typeof fn === 'function') {
    fn();
  }
}

/** Type guard to detect Promise-like values. */
export function isPromise<T = unknown>(value: any): value is Promise<T> {
  return !!value && typeof value.then === 'function';
}

/** Non-throwing error handler for async hook failures to preserve workflow continuity. */
export function handleAsyncError(err: unknown, phase: 'transitionIn' | 'transitionOut', hookIndex: number) {
  const msg = err instanceof Error ? err.message : String(err);

  console.warn(`${LOG_PREFIX} ${phase} hook #${hookIndex} rejected: ${msg}`);
}

/**
 * Execute transitionOut cleanups when navigating back into a step.
 * Marks the cleanup array as executed so late async cleanups resolve immediately.
 */
export function runOutCleanupOnBack(cleanups: CleanupFnArray) {
  for (const cleanup of cleanups) {
    safeInvokeCleanup(cleanup);
  }
  cleanups[CLEANUP_ARRAY_EXECUTED] = true;
}

/** Shallow equality comparison for dependency lists. */
export function shallowEqual(a?: DependencyList, b?: DependencyList): boolean {
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
