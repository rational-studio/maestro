import expression from '@motif-ts/expression';

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
    kind: 'default',
    from,
    to,
    unidirectional,
    validateTransition(outputFrom) {
      // Pass-through without transformation; types are compatible (O extends I)
      return { allow: true, nextInput: outputFrom };
    },
    serialize() {
      return { kind: 'default', from: this.from.id, to: this.to.id, unidirectional: this.unidirectional };
    },
  };
}

export function conditionalEdge<I, O extends I>(
  from: StepInstance<any, O, any, any, any>,
  to: StepInstance<I, any, any, any, any>,
  predicateExprSrc: string,
  unidirectional = false,
): Edge<I, O> {
  const compiled = expression(predicateExprSrc);
  return {
    kind: 'conditional',
    from,
    to,
    unidirectional,
    validateTransition(outputFrom) {
      const ok = !!compiled({ out: outputFrom });
      return ok ? { allow: true as const, nextInput: outputFrom } : { allow: false as const };
    },
    serialize() {
      return {
        kind: 'conditional',
        from: this.from.id,
        to: this.to.id,
        unidirectional: this.unidirectional,
        expr: predicateExprSrc,
      };
    },
  };
}

export function transformEdge<I, O>(
  from: StepInstance<any, O, any, any, any>,
  to: StepInstance<I, any, any, any, any>,
  transformExprSrc: string,
  unidirectional = false,
): Edge<I, O> {
  const compiled = expression(transformExprSrc);
  return {
    kind: 'transform',
    from,
    to,
    unidirectional,
    validateTransition(outputFrom) {
      try {
        const convertedRaw = compiled({ out: outputFrom });
        if (convertedRaw === undefined) {
          throw new Error('result is undefined');
        }
        const converted = convertedRaw as I;
        return { allow: true as const, nextInput: converted };
      } catch (e: any) {
        // Handle conversion errors explicitly
        const msg = e?.message ?? String(e);
        throw new Error(`TransformEdge: failed to convert output -> input. Reason: ${msg}`);
      }
    },
    serialize() {
      return {
        kind: 'transform',
        from: this.from.id,
        to: this.to.id,
        unidirectional: this.unidirectional,
        expr: transformExprSrc,
      };
    },
  };
}
