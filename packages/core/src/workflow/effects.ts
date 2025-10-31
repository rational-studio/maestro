/**
 * Effect processing utilities for workflow steps.
 * Handles initial effect execution and diffing to determine re-runs on rebuild.
 */
import { type CleanupFn, type DependencyList } from '../step/types';
import { shallowEqual } from './utils';

export type EffectDef = { deps?: DependencyList; run: () => CleanupFn };
export type EffectEntry = { deps?: DependencyList; run: () => CleanupFn; cleanup?: CleanupFn };

/**
 * Initialize effects by executing each effect once and capturing its cleanup.
 */
export function initialEffects(effectsDefs: EffectDef[]): EffectEntry[] {
  const nextEffects: EffectEntry[] = [];
  for (let i = 0; i < effectsDefs.length; i++) {
    const def = effectsDefs[i];
    const cleanup: CleanupFn = def.run();
    nextEffects[i] = { deps: def.deps, run: def.run, cleanup };
  }
  return nextEffects;
}

/**
 * Compute the next set of effects by diffing dependency arrays and re-running effects when needed.
 */
export function computeNextEffects(prevEffects: EffectEntry[], effectsDefs: EffectDef[]): EffectEntry[] {
  const nextEffects: EffectEntry[] = [];
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
  return nextEffects;
}
