import { type StepInstance } from '../step/types';

// Base shape shared by all edges
export type Edge<I, O> = {
  kind: string;
  from: StepInstance<any, O, any, any, any>;
  to: StepInstance<I, any, any, any, any>;
  serializable?: boolean;
  // Whether reverse/back transition from `to` to `from` is allowed
  unidirectional: boolean;
  // Validate forward transition from `from` to `to` using the output produced by `from`
  // Return allow=false to block transition; optionally supply transformed nextInput
  validateTransition(outputFrom: O): { allow: true; nextInput: I } | { allow: false };
};

export interface SerializableEdge<I, O> extends Edge<I, O> {
  serializable: true;
  serialize(): unknown;
}

export interface DeserializableEdgeFunc {
  deserialize(
    from: StepInstance<any, any, any, any, any>,
    to: StepInstance<any, any, any, any, any>,
    unidirectional: boolean,
    serialized: unknown,
  ): SerializableEdge<any, any>;
}
