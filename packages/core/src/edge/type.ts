import { type StepInstance } from '../step/types';

// Unified Edge interface with validateTransition method
export interface Edge<I, O> {
  from: StepInstance<any, O, any, any, any>;
  to: StepInstance<I, any, any, any, any>;
  // Whether reverse/back transition from `to` to `from` is allowed
  unidirectional: boolean;
  // Validate forward transition from `from` to `to` using the output produced by `from`
  // Return allow=false to block transition; optionally supply transformed nextInput
  validateTransition(outputFrom: O): { allow: true; nextInput: I } | { allow: false };
}
