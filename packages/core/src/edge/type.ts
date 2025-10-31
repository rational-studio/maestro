import { type StepInstance } from '../step/types';

// Discriminated union for Edge kinds
export type EdgeKind = 'default' | 'conditional' | 'transform';

// Base shape shared by all edges
export interface BaseEdge<I, O> {
  kind: EdgeKind;
  from: StepInstance<any, O, any, any, any>;
  to: StepInstance<I, any, any, any, any>;
  // Whether reverse/back transition from `to` to `from` is allowed
  unidirectional: boolean;
  // Validate forward transition from `from` to `to` using the output produced by `from`
  // Return allow=false to block transition; optionally supply transformed nextInput
  validateTransition(outputFrom: O): { allow: true; nextInput: I } | { allow: false };
}

// Default pass-through edge (requires O extends I)
export interface DefaultEdge<I, O extends I> extends BaseEdge<I, O> {
  kind: 'default';
}

// Conditional edge evaluates an expression against env { out }
export interface ConditionalEdge<I, O extends I> extends BaseEdge<I, O> {
  kind: 'conditional';
  exprSrc: string;
  compiled: (env: { out: O }) => unknown;
}

// Transform edge evaluates an expression to produce next input from env { out }
export interface TransformEdge<I, O> extends BaseEdge<I, O> {
  kind: 'transform';
  exprSrc: string;
  compiled: (env: { out: O }) => unknown;
}

// Unified Edge interface with kind-based discrimination
// @ts-expect-error
export type Edge<I, O> = DefaultEdge<I, O> | ConditionalEdge<I, O> | TransformEdge<I, O>;
