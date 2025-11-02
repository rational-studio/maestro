import { type ZodType } from 'zod';

import { type StepInstance } from '../step/types';

export interface EdgeCreator<Input, Output, Config> {
  (): (
    from: StepInstance<any, Output, any, any, any>,
    to: StepInstance<Input, any, any, any, any>,
    unidirectional: boolean,
  ) => EdgeInstance<Input, Output>;
  (
    configSchema: ZodType<Config>,
  ): (
    from: StepInstance<any, Output, any, any, any>,
    to: StepInstance<Input, any, any, any, any>,
    unidirectional: boolean,
    config: Config,
  ) => EdgeInstance<Input, Output>;
}

// Base shape shared by all edges
export interface EdgeInstance<I, O> {
  kind: string;
  from: StepInstance<any, O, any, any, any>;
  to: StepInstance<I, any, any, any, any>;
  // Whether reverse/back transition from `to` to `from` is allowed
  unidirectional: boolean;
  // Validate forward transition from `from` to `to` using the output produced by `from`
  // Return allow=false to block transition; optionally supply transformed nextInput
  validateTransition(outputFrom: O): { allow: true; nextInput: I } | { allow: false };
}
