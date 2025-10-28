# Motif-TS: Workflow Orchestrator
**Dead Simple. Fully Typed. Effortlessly Orchestrated**

---


Deterministic workflow orchestrator for Node.js and browsers with strongly typed 1‑in/1‑out steps, lifecycle hooks with cleanups, store‑driven rebuilds, conditional/transform edges, and bidirectional navigation with history.

See `tests/` for comprehensive, deterministic examples.

## Features

- Strong types with Zod: validate step `input`/`output` at runtime
- Lifecycle hooks with cleanups: `transitionIn`, `transitionOut`, `effect`
- Store integration: optional Zustand store per step with rebuild on changes
- Edges: bidirectional by default; unidirectional, conditional, and transform variants
- Back navigation: return to previous step with preserved input and cleanup handling
- Transition notifications: subscribe to `transitionIn`, `ready`, and `transitionOut` events
- React integration: `useWorkflow` via `useSyncExternalStore`

## Quick Start

```ts
import z from 'zod';
import { workflow, step } from '@motif-ts/core';

// Define steps
const A = step(
  { kind: 'A', outputSchema: z.number() },
  ({ transitionIn, transitionOut, effect, next }) => {
    transitionIn(() => {
      console.log('A in');
      return () => console.log('A in cleanup');
    });
    transitionOut(() => {
      console.log('A out');
      return () => console.log('A out cleanup');
    });
    effect(() => {
      console.log('A effect');
      return () => console.log('A effect cleanup');
    });
    return { go: () => next(1) };
  },
);

const B = step(
  { kind: 'B', inputSchema: z.number(), outputSchema: z.number() },
  ({ transitionIn, input, next }) => {
    transitionIn(() => {
      console.log('B in', input);
      return () => console.log('B in cleanup');
    });
    return { go: () => next(input + 1) };
  },
);

// Create orchestrator with inventory of step creators
const orchestrator = new workflow([A, B]);

// Create step instances, register, connect, and start
const a = A();
const b = B();
orchestrator.register([a, b]);
orchestrator.connect(a, b); // bidirectional by default
orchestrator.start(a); // A -> B via a.state.go()

// Navigate back (B -> A)
orchestrator.back();
```

## Lifecycle Hooks and Effects

- `transitionIn(hook)` runs once on entering a step. Return a cleanup to run when leaving.
- `transitionOut(hook)` runs once before leaving a step. Return a cleanup; stored and executed when navigating back into this step.
- `effect(fn, deps?)` runs on initial build and rebuilds. Return a cleanup. Dependency behavior:
  - `deps` omitted: runs on every rebuild
  - `deps` `[]`: runs once on first mount
  - `deps` with values: runs when shallowly unequal to previous

Cleanup execution order when leaving a step:
1. Run `transitionOut` hooks (and invoke any returned cleanup)
2. Run `effect` cleanups
3. Run `transitionIn` cleanups

Errors thrown inside hooks or cleanups are caught and ignored to preserve flow. Hooks may be `async`, but cleanups must be returned synchronously.

## Edges and Navigation

- Default edge (`connect(a, b)`): bidirectional forward/back.
- Unidirectional: `connect(a, b, true)` blocks `back()` when returning from `b` to `a`.
- Conditional: gate transitions by predicate.

```ts
import { conditionalEdge } from '@motif-ts/core';
orchestrator.connect<number, number>(conditionalEdge(a, b, (out) => out % 2 === 0));
```

- Transform: convert output type to next input type; throws with clear message if conversion fails.

```ts
import { transformEdge } from '@motif-ts/core';
orchestrator.connect(transformEdge(a, b, (out) => ({ username: out.name, years: out.age })));
```

Forward transitions validate `output` via Zod (if provided) and select the first outgoing edge that allows the move. If none allow, an error is thrown (`'Transition blocked by edge condition'`). If there are no outgoing edges, `'No next step'` is thrown.

Back navigation re‑enters the previous step with its original input and executes previously collected `transitionOut` cleanups for that step. If the connecting edge is `unidirectional`, `back()` throws a clear error.

## Store Integration (Zustand)

Steps can optionally define a store via `createStore`. The store state is exposed as `store` in build args and drives rebuilds.

```ts
import { type StateCreator } from 'zustand/vanilla';

const sStore: StateCreator<{ n: number; inc: () => void }> = (set) => ({
  n: 0,
  inc: () => set((prev) => ({ n: prev.n + 1 })),
});

const S = Step(
  { kind: 'S', outputSchema: z.object({ n: z.number() }), createStore: sStore },
  ({ store, effect, next }) => {
    effect(() => undefined, [store.n]);
    return {
      count: store.n,
      bump: () => store.inc(),
      goNext: () => next({ n: store.n }),
    };
  },
);
```

When the store updates, the orchestrator rebuilds the current step, re‑evaluates effects (with dependency diffing), and emits a `ready` notification.

## Notifications and Current Step

Subscribe to transitions and read current step state:

```ts
const events: Array<{ kind: string; name: string; status: string }> = [];
const unsub = orchestrator.subscribe((kind, name, status) => {
  events.push({ kind, name, status });
});

const cur = orchestrator.getCurrentStep();
// cur.status: 'notStarted' | 'transitionIn' | 'ready' | 'transitionOut'
// cur.state: API returned by your step's build function

unsub();
```

## React Integration

```ts
import { useWorkflow } from '@motif-js/core/react';

function App({ orchestrator }: { orchestrator: workflow<[typeof S, typeof T]> }) {
  const current = useWorkflow(orchestrator);
  if (current.status !== 'ready') return null;
  return <div>{String(current.state.count)}</div>;
}
```

## Step Variants and Build Args

`Step` supports combinations of:
- `inputSchema` (optional)
- `outputSchema` (optional)
- `configSchema` (optional)
- `createStore` (optional)

Build args include:
- Always: `name`, `input`, `next`, `transitionIn`, `transitionOut`, `effect`
- Plus `config` when `configSchema` is present
- Plus `store` when `createStore` is present

## Inventory and Registration

- Create orchestrator with an inventory of step creators: `new workflow([A, B, ...])`
- Each `kind` must be unique; duplicates throw a detailed error
- Register step instances before connecting/starting: `orchestrator.register([a, b])`
- `connect` requires registered instances; `start` requires a registered instance from the inventory

## Error Handling

- Zod validation errors surface when output or next input fails to parse
- Conditional edges that block transitions throw `'Transition blocked by edge condition'`
- Missing outgoing edges throw `'No next step'`
- `back()` throws when attempting to reverse a `unidirectional` edge
- Hook/effect cleanups swallow errors to maintain flow

## Notes

- Hooks may be `async`, but cleanup functions must be returned synchronously
- Works in Node and browsers; React integration is optional