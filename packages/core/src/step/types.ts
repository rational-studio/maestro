import { type ZodType } from 'zod';
import { type StateCreator, type StoreApi, type StoreMutatorIdentifier } from 'zustand/vanilla';

import { type CLEANUP_ARRAY_EXECUTED } from './constants';

export type CleanupFn = void | (() => void);

export type CleanupFnArray = CleanupFn[] & { [CLEANUP_ARRAY_EXECUTED]?: boolean };

// Transition hooks may be synchronous or asynchronous and return an optional cleanup function.
// Async hooks should resolve to a cleanup function; rejection is handled by the workflow runtime.
export type TransitionHook = () => CleanupFn | Promise<CleanupFn>;

export type DependencyList = readonly unknown[];

export type BuildArgs<Input, Output, Config, Store> = {
  name: string;
  transitionIn: (hook: TransitionHook) => void;
  transitionOut: (hook: TransitionHook) => void;
  effect: (fn: () => CleanupFn, deps?: DependencyList) => void;
  input: Input;
  next: (output: Output) => void;
} & ([Store] extends [undefined] ? {} : { store: Store }) &
  ([Config] extends [undefined] ? {} : { config: Config });

export type StepDef<
  Kind extends string,
  Input,
  Output,
  Config,
  Store,
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
> = {
  kind: Kind;
  inputSchema?: ZodType<Input>;
  outputSchema?: ZodType<Output>;
  configSchema?: ZodType<Config>;
  createStore?: StateCreator<Store, [], Mos>;
};

export type StepAPI = Record<string, unknown>;

export type StepInstance<Input, Output, Config, Api extends StepAPI, Store> = {
  kind: string;
  name: string;
  id: string;
  inputSchema?: ZodType<Input>;
  outputSchema?: ZodType<Output>;
  configSchema?: ZodType<Config>;
  storeApi?: StoreApi<Store>;
  config?: Config;
  build: (args: BuildArgs<Input, Output, Config, Store>) => Api;
};

export type StepCreatorAny = {
  kind: string;
} & ((...args: any[]) => StepInstance<any, any, any, any, any>);

export interface StepCreatorNoConfig<K extends string, Input, Output, Api extends StepAPI, Store> {
  kind: K;
  (name?: string): StepInstance<Input, Output, undefined, Api, Store>;
}

export interface StepCreatorConfig<K extends string, Input, Output, Config, Api extends StepAPI, Store> {
  kind: K;
  (name: string, config: Config): StepInstance<Input, Output, Config, Api, Store>;
  (config: Config): StepInstance<Input, Output, Config, Api, Store>;
}
