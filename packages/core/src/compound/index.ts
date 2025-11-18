import z from 'zod/v4';

import { edge } from '../edge';
import { type Edge } from '../edge/type';
import { step } from '../step';
import {
  type BuildArgs,
  type EMPTY,
  type StepAPI,
  type StepCreatorAny,
  type StepInstance,
  type UNKNOWN,
} from '../step/types';
import { workflow } from '../workflow';
import { type CurrentStepStatus } from '../workflow/types';

type AllCreators<Creators extends readonly StepCreatorAny[]> = readonly [...Creators, StepCreatorAny];

type CompoundStepAPI<Creators extends readonly StepCreatorAny[]> = {
  getInnerCurrent: () => CurrentStepStatus<AllCreators<Creators>>;
  getInnerState: () => CurrentStepStatus<AllCreators<Creators>>['state'];
  subscribe: (cb: (current: CurrentStepStatus<AllCreators<Creators>>, running: boolean) => void) => () => void;
};

export function makeCompoundStep<const Creators extends readonly StepCreatorAny[]>(inventory: Creators) {
  const Compound = step<'compound', UNKNOWN, Record<string, never>, CompoundStepAPI<Creators>>(
    {
      kind: 'compound',
      inputSchema: z.any(),
      outputSchema: z.object({}),
    },
    (_args) => {
      // The actual build implementation will be attached per-instance via closures on the instance
      // Placeholder; real logic provided by instance augmentation below
      const placeholder = {
        getInnerCurrent: () => {
          throw new Error(
            'CompoundStep is not initialized. Ensure you used instance-level register/connect/setEntry/setExit before workflow.start',
          );
        },
        getInnerState: () => undefined as unknown as CurrentStepStatus<AllCreators<Creators>>['state'],
        subscribe: () => () => void 0,
      };
      return placeholder as unknown as CompoundStepAPI<Creators>;
    },
  );

  type InnerInstance = ReturnType<Creators[number]>;
  type AugmentedCompoundInstance = StepInstance<
    UNKNOWN,
    Record<string, never>,
    undefined,
    CompoundStepAPI<Creators>,
    EMPTY
  > & {
    register: (nodesArg: InnerInstance | readonly InnerInstance[]) => AugmentedCompoundInstance;
    connect: (
      fromOrEdge: InnerInstance | Edge<UNKNOWN, UNKNOWN>,
      to?: InnerInstance,
      unidirectional?: boolean,
    ) => AugmentedCompoundInstance;
    setEntry: (node: InnerInstance) => AugmentedCompoundInstance;
    setExit: (node: InnerInstance) => AugmentedCompoundInstance;
  };

  function augmentInstance(
    instance: StepInstance<UNKNOWN, Record<string, never>, undefined, CompoundStepAPI<Creators>, EMPTY>,
  ) {
    const innerNodes = new Set<InnerInstance>();
    const innerEdges: Edge<UNKNOWN, UNKNOWN>[] = [];
    let entry: InnerInstance | undefined;
    let exit: InnerInstance | undefined;

    const apiHolder: { api?: CompoundStepAPI<Creators> } = {};

    const register = (nodesArg: InnerInstance | readonly InnerInstance[]) => {
      const list = Array.isArray(nodesArg) ? nodesArg : [nodesArg];
      for (const n of list) {
        innerNodes.add(n);
      }
      return augmented;
    };

    const connect = (
      fromOrEdge: InnerInstance | Edge<UNKNOWN, UNKNOWN>,
      to?: InnerInstance,
      unidirectional = false,
    ) => {
      if (to) {
        const e = edge(fromOrEdge as InnerInstance, to, unidirectional);
        innerEdges.push(e);
      } else {
        innerEdges.push(fromOrEdge as Edge<UNKNOWN, UNKNOWN>);
      }
      return augmented;
    };

    const setEntry = (node: InnerInstance) => {
      entry = node;
      instance.inputSchema = node.inputSchema;
      return augmented;
    };

    const setExit = (node: InnerInstance) => {
      exit = node;
      instance.outputSchema = node.outputSchema;
      return augmented;
    };

    // Replace the instance build with real logic bound to this composition
    instance.build = (outerArgs: BuildArgs<UNKNOWN, Record<string, never>, EMPTY, EMPTY>) => {
      if (!entry || !exit) {
        throw new Error(`CompoundStep '${instance.id}' requires entry and exit to be set before start`);
      }
      const exitNode = exit;

      const Forward = step<'__compound_forward__', StepAPI>({ kind: '__compound_forward__' }, (forwardArgs) => {
        forwardArgs.transitionIn(() => {
          const value =
            exitNode && exitNode.outputSchema
              ? exitNode.outputSchema.parse(forwardArgs.input as unknown)
              : (forwardArgs.input as unknown);
          outerArgs.next(value);
          return void 0;
        });
        return {} as StepAPI;
      });
      const creators: readonly StepCreatorAny[] = [...inventory, Forward];
      const inner = workflow(creators);

      // Register all inner nodes
      inner.register(Array.from(innerNodes));

      const forward = Forward(`forward_${instance.id}`);
      inner.register(forward);

      // Connect inner edges and exit → forward
      for (const e of innerEdges) {
        inner.connect(e);
      }
      inner.connect(exit, forward);

      // Enter the inner entry; if the entry requires input, consume the outer input within the entry's own implementation
      inner.start(entry);

      const api: CompoundStepAPI<Creators> = {
        getInnerCurrent: () => inner.getCurrentStep() as CurrentStepStatus<AllCreators<Creators>>, // safe: Forward is StepCreatorAny
        getInnerState: () =>
          inner.getCurrentStep().state as unknown as CurrentStepStatus<AllCreators<Creators>>['state'],
        subscribe: (cb) =>
          inner.subscribe(cb as (current: CurrentStepStatus<readonly StepCreatorAny[]>, running: boolean) => void),
      };

      apiHolder.api = api;

      // Outer transitionOut does not actively stop the inner workflow to avoid context errors caused by concurrent inner transitionIn.

      return api;
    };

    const augmented = instance as unknown as AugmentedCompoundInstance;
    Object.assign(augmented, { register, connect, setEntry, setExit });
    return augmented;
  }

  const create = (name?: string) => {
    const inst = Compound(name);
    return augmentInstance(inst);
  };

  return Object.assign(create, { kind: 'compound' }) as { kind: 'compound' } & ((
    name?: string,
  ) => AugmentedCompoundInstance);
}
