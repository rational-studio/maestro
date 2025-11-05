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

export interface DeserializableEdgeFactory {
  deserialize(
    from: StepInstance<any, any, any, any, any>,
    to: StepInstance<any, any, any, any, any>,
    unidirectional: boolean,
    serialized: unknown,
  ): SerializableEdge<any, any>;
}

export interface EdgeFactory<Args extends unknown[]> {
  <I, O extends I>(
    from: StepInstance<any, O, any, any, any>,
    to: StepInstance<I, any, any, any, any>,
    ...args: Args
  ): Edge<I, O>;
}

export interface EdgeFactoryConstraintFree<Args extends unknown[]> {
  <I, O>(from: StepInstance<any, O, any, any, any>, to: StepInstance<I, any, any, any, any>, ...args: Args): Edge<I, O>;
}

export interface EdgeFactorySerializable<Args extends unknown[]> extends DeserializableEdgeFactory {
  <I, O extends I>(
    from: StepInstance<any, O, any, any, any>,
    to: StepInstance<I, any, any, any, any>,
    ...args: Args
  ): SerializableEdge<I, O>;
}

export interface EdgeFactorySerializableConstraintFree<Args extends unknown[]> extends DeserializableEdgeFactory {
  <I, O>(
    from: StepInstance<any, O, any, any, any>,
    to: StepInstance<I, any, any, any, any>,
    ...args: Args
  ): SerializableEdge<I, O>;
}
