import { type StepInstance } from '../step/types';
import { type Edge } from './type';

// BidirectionalEdge: default connector allowing forward and backward transitions
// Use when connectingA, B) without specifying edge type.
export function edge<I, O extends I>(
  from: StepInstance<any, O, any, any, any>,
  to: StepInstance<I, any, any, any, any>,
  unidirectional = false,
): Edge<I, O> {
  return {
    from,
    to,
    unidirectional,
    validateTransition(outputFrom) {
      // Pass-through without transformation; types are compatible (O extends I)
      return { allow: true, nextInput: outputFrom };
    },
  };
}

export function conditionalEdge<I, O extends I>(
  from: StepInstance<any, O, any, any, any>,
  to: StepInstance<I, any, any, any, any>,
  predicate: (outputFrom: O) => boolean,
  unidirectional = false,
): Edge<I, O> {
  return {
    from,
    to,
    unidirectional,
    validateTransition(outputFrom) {
      const ok = predicate(outputFrom);
      return ok ? { allow: true as const, nextInput: outputFrom } : { allow: false as const };
    },
  };
}

export function transformEdge<I, O>(
  from: StepInstance<any, O, any, any, any>,
  to: StepInstance<I, any, any, any, any>,
  transformer: (outputFrom: O) => I,
  unidirectional = false,
): Edge<I, O> {
  return {
    from,
    to,
    unidirectional,
    validateTransition(outputFrom) {
      try {
        const converted = transformer(outputFrom);
        return { allow: true as const, nextInput: converted };
      } catch (e: any) {
        // Handle conversion errors explicitly
        const msg = e?.message ?? String(e);
        throw new Error(`TransformEdge: failed to convert output -> input. Reason: ${msg}`);
      }
    },
  };
}
