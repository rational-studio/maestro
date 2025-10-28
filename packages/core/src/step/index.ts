import { type ZodType } from 'zod';
import { createStore, type StateCreator, type StoreMutatorIdentifier } from 'zustand/vanilla';

import {
  type BuildArgs,
  type StepAPI,
  type StepCreatorConfig,
  type StepCreatorNoConfig,
  type StepDef,
  type StepInstance,
} from './types';

// 1) configSchema present, createStore present
// 1.1) inputSchema present, outputSchema present
export function step<
  Kind extends string,
  Input,
  Output,
  Config,
  Api extends StepAPI,
  Store,
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
>(
  def: {
    kind: Kind;
    inputSchema: ZodType<Input>;
    outputSchema: ZodType<Output>;
    configSchema: ZodType<Config>;
    createStore: StateCreator<Store, [], Mos>;
  },
  build: (args: BuildArgs<Input, Output, Config, Store>) => Api,
): StepCreatorConfig<Kind, Input, Output, Config, Api, Store>;

// 1.2) inputSchema present, outputSchema absent
export function step<
  Kind extends string,
  Input,
  Output,
  Config,
  Api extends StepAPI,
  Store,
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
>(
  def: {
    kind: Kind;
    inputSchema: ZodType<Input>;
    configSchema: ZodType<Config>;
    createStore: StateCreator<Store, [], Mos>;
  },
  build: (args: BuildArgs<Input, Output, Config, Store>) => Api,
): StepCreatorConfig<Kind, Input, Output, Config, Api, Store>;

// 1.3) inputSchema absent, outputSchema present
export function step<
  Kind extends string,
  Input,
  Output,
  Config,
  Api extends StepAPI,
  Store,
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
>(
  def: {
    kind: Kind;
    outputSchema: ZodType<Output>;
    configSchema: ZodType<Config>;
    createStore: StateCreator<Store, [], Mos>;
  },
  build: (args: BuildArgs<Input, Output, Config, Store>) => Api,
): StepCreatorConfig<Kind, Input, Output, Config, Api, Store>;

// 1.4) inputSchema absent, outputSchema absent
export function step<
  Kind extends string,
  Input,
  Output,
  Config,
  Api extends StepAPI,
  Store,
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
>(
  def: {
    kind: Kind;
    configSchema: ZodType<Config>;
    createStore: StateCreator<Store, [], Mos>;
  },
  build: (args: BuildArgs<Input, Output, Config, Store>) => Api,
): StepCreatorConfig<Kind, Input, Output, Config, Api, Store>;

// 2) configSchema present, createStore absent
// 2.1) inputSchema present, outputSchema present
export function step<Kind extends string, Input, Output, Config, Api extends StepAPI>(
  def: { kind: Kind; inputSchema: ZodType<Input>; outputSchema: ZodType<Output>; configSchema: ZodType<Config> },
  build: (args: BuildArgs<Input, Output, Config, undefined>) => Api,
): StepCreatorConfig<Kind, Input, Output, Config, Api, undefined>;

// 2.2) inputSchema present, outputSchema absent
export function step<Kind extends string, Input, Output, Config, Api extends StepAPI>(
  def: { kind: Kind; inputSchema: ZodType<Input>; configSchema: ZodType<Config> },
  build: (args: BuildArgs<Input, Output, Config, undefined>) => Api,
): StepCreatorConfig<Kind, Input, Output, Config, Api, undefined>;

// 2.3) inputSchema absent, outputSchema present
export function step<Kind extends string, Input, Output, Config, Api extends StepAPI>(
  def: { kind: Kind; outputSchema: ZodType<Output>; configSchema: ZodType<Config> },
  build: (args: BuildArgs<Input, Output, Config, undefined>) => Api,
): StepCreatorConfig<Kind, Input, Output, Config, Api, undefined>;

// 2.4) inputSchema absent, outputSchema absent
export function step<Kind extends string, Input, Output, Config, Api extends StepAPI>(
  def: { kind: Kind; configSchema: ZodType<Config> },
  build: (args: BuildArgs<Input, Output, Config, undefined>) => Api,
): StepCreatorConfig<Kind, Input, Output, Config, Api, undefined>;

// 3) configSchema absent, createStore present
// 3.1) inputSchema present, outputSchema present
export function step<
  Kind extends string,
  Input,
  Output,
  Api extends StepAPI,
  Store,
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
>(
  def: {
    kind: Kind;
    inputSchema: ZodType<Input>;
    outputSchema: ZodType<Output>;
    createStore: StateCreator<Store, [], Mos>;
  },
  build: (args: BuildArgs<Input, Output, undefined, Store>) => Api,
): StepCreatorNoConfig<Kind, Input, Output, Api, Store>;

// 3.2) inputSchema present, outputSchema absent
export function step<
  Kind extends string,
  Input,
  Output,
  Api extends StepAPI,
  Store,
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
>(
  def: {
    kind: Kind;
    inputSchema: ZodType<Input>;
    createStore: StateCreator<Store, [], Mos>;
  },
  build: (args: BuildArgs<Input, Output, undefined, Store>) => Api,
): StepCreatorNoConfig<Kind, Input, Output, Api, Store>;

// 3.3) inputSchema absent, outputSchema present
export function step<
  Kind extends string,
  Input,
  Output,
  Api extends StepAPI,
  Store,
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
>(
  def: {
    kind: Kind;
    outputSchema: ZodType<Output>;
    createStore: StateCreator<Store, [], Mos>;
  },
  build: (args: BuildArgs<Input, Output, undefined, Store>) => Api,
): StepCreatorNoConfig<Kind, Input, Output, Api, Store>;

// 3.4) inputSchema absent, outputSchema absent
export function step<
  Kind extends string,
  Input,
  Output,
  Api extends StepAPI,
  Store,
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
>(
  def: {
    kind: Kind;
    createStore: StateCreator<Store, [], Mos>;
  },
  build: (args: BuildArgs<Input, Output, undefined, Store>) => Api,
): StepCreatorNoConfig<Kind, Input, Output, Api, Store>;

// 4) configSchema absent, createStore absent
// 4.1) inputSchema present, outputSchema present
export function step<Kind extends string, Input, Output, Api extends StepAPI>(
  def: { kind: Kind; inputSchema: ZodType<Input>; outputSchema: ZodType<Output> },
  build: (args: BuildArgs<Input, Output, undefined, undefined>) => Api,
): StepCreatorNoConfig<Kind, Input, Output, Api, undefined>;

// 4.2) inputSchema present, outputSchema absent
export function step<Kind extends string, Input, Output, Api extends StepAPI>(
  def: { kind: Kind; inputSchema: ZodType<Input> },
  build: (args: BuildArgs<Input, Output, undefined, undefined>) => Api,
): StepCreatorNoConfig<Kind, Input, Output, Api, undefined>;

// 4.3) inputSchema absent, outputSchema present
export function step<Kind extends string, Input, Output, Api extends StepAPI>(
  def: { kind: Kind; outputSchema: ZodType<Output> },
  build: (args: BuildArgs<Input, Output, undefined, undefined>) => Api,
): StepCreatorNoConfig<Kind, Input, Output, Api, undefined>;

// 4.4) inputSchema absent, outputSchema absent
export function step<Kind extends string, Input, Output, Api extends StepAPI>(
  def: { kind: Kind },
  build: (args: BuildArgs<Input, Output, undefined, undefined>) => Api,
): StepCreatorNoConfig<Kind, Input, Output, Api, undefined>;

// runtime implementation
export function step<
  Kind extends string,
  Input,
  Output,
  Config,
  Api extends StepAPI,
  Store,
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
>(
  def: StepDef<Kind, Input, Output, Config, Store, Mos>,
  build: (args: BuildArgs<Input, Output, Config, Store>) => Api,
) {
  function createInstance(nameOrConfigArg?: unknown, configArg?: unknown) {
    const nameValue = typeof nameOrConfigArg === 'string' ? nameOrConfigArg : 'default';
    const configValue = def.configSchema
      ? configArg
        ? def.configSchema.parse(configArg)
        : def.configSchema.parse(nameOrConfigArg)
      : undefined;

    const storeApi = def.createStore ? createStore(def.createStore) : undefined;

    const instance: StepInstance<Input, Output, Config, Api, Store> = {
      kind: def.kind,
      name: nameValue,
      id: `${def.kind}_${nameValue}`,
      inputSchema: def.inputSchema,
      outputSchema: def.outputSchema,
      configSchema: def.configSchema,
      config: configValue,
      storeApi,
      build,
    };
    return instance;
  }
  const createWithKind = Object.assign(createInstance, { kind: def.kind });
  return createWithKind;
}
