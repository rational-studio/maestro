import expression from '@motif-ts/expression';

import { type StepInstance } from '../step/types';
import { createSerializableEdge } from './factory';

export const edge = createSerializableEdge(
  <I, O extends I>(
    from: StepInstance<any, O, any, any, any>,
    to: StepInstance<I, any, any, any, any>,
    unidirectional = false,
  ) => {
    return {
      kind: 'default',
      from,
      to,
      unidirectional,
      serializable: true,
      validateTransition(outputFrom) {
        // Pass-through without transformation; types are compatible (O extends I)
        return { allow: true, nextInput: outputFrom };
      },
      serialize() {
        return null;
      },
    };
  },
);

edge.deserialize = (from, to, unidirectional) => {
  return edge(from, to, unidirectional);
};

export const conditionalEdge = createSerializableEdge(
  <I, O extends I>(
    from: StepInstance<any, O, any, any, any>,
    to: StepInstance<I, any, any, any, any>,
    predicateExprSrc: string,
    unidirectional = false,
  ) => {
    const compiled = expression(predicateExprSrc);
    return {
      kind: 'conditional',
      from,
      to,
      unidirectional,
      serializable: true,
      validateTransition(outputFrom: O) {
        const ok = !!compiled({ out: outputFrom });
        return ok ? { allow: true, nextInput: outputFrom } : { allow: false };
      },
      serialize() {
        return predicateExprSrc;
      },
    };
  },
);

conditionalEdge.deserialize = (from, to, unidirectional, expr) => {
  if (typeof expr !== 'string') {
    throw new Error('ConditionalEdge: serialized must be a string');
  }
  return conditionalEdge(from, to, expr, unidirectional);
};

export const transformEdge = createSerializableEdge(
  <I, O>(
    from: StepInstance<any, O, any, any, any>,
    to: StepInstance<I, any, any, any, any>,
    transformExprSrc: string,
    unidirectional = false,
  ) => {
    const compiled = expression(transformExprSrc);
    return {
      kind: 'transform',
      from,
      to,
      unidirectional,
      serializable: true,
      validateTransition(outputFrom: O) {
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
        return transformExprSrc;
      },
    };
  },
);

transformEdge.deserialize = (from, to, unidirectional, transformExprSrc) => {
  if (typeof transformExprSrc !== 'string') {
    throw new Error('TransformEdge: serialized must be a string');
  }
  return transformEdge(from, to, transformExprSrc, unidirectional);
};
