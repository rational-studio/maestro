import { assert, describe, expect, it } from 'vitest';
import z from 'zod/v4';
import { type StateCreator } from 'zustand/vanilla';

import { step, workflow } from '../src';

describe('Workflow.subscribe notifications', () => {
  const sStore: StateCreator<{ n: number; inc: () => void }> = (set) => ({
    n: 0,
    inc: () => set((prev) => ({ n: prev.n + 1 })),
  });

  const S = step(
    {
      kind: 'S',
      outputSchema: z.object({ n: z.number() }),
      createStore: sStore,
    },
    ({ store, transitionIn, transitionOut, effect, next }) => {
      transitionIn(() => {});
      transitionOut(() => {});
      effect(() => undefined, [store.n]);
      return {
        count: store.n,
        bump() {
          store.inc();
        },
        goNext() {
          next({ n: store.n });
        },
      };
    },
  );

  const T = step(
    {
      kind: 'T',
      inputSchema: z.object({ n: z.number() }),
      outputSchema: z.object({}),
    },
    ({ input, transitionIn, transitionOut }) => {
      transitionIn(() => {});
      transitionOut(() => {});
      return {
        received() {
          return input.n;
        },
      };
    },
  );

  it('emits transitionIn and ready on start', () => {
    const orchestrator = workflow([S]);
    const s = S('main');
    orchestrator.register(s);

    const events: Array<{ kind: string; name: string; status: string }> = [];
    orchestrator.subscribe((currentStep) => {
      events.push({ kind: currentStep.kind, name: currentStep.name, status: currentStep.status });
    });

    orchestrator.start(s);

    expect(events).toEqual([
      { kind: 'S', name: 'main', status: 'transitionIn' },
      { kind: 'S', name: 'main', status: 'ready' },
    ]);
  });

  it('emits transitionOut -> transitionIn -> ready when moving to next step', () => {
    const orchestrator = workflow([S, T]);
    const s = S('s1');
    const t = T('t1');
    orchestrator.register([s, t]);
    orchestrator.connect(s, t);

    const events: Array<{ kind: string; name: string; status: string }> = [];
    orchestrator.subscribe((currentStep) => {
      events.push({ kind: currentStep.kind, name: currentStep.name, status: currentStep.status });
    });

    orchestrator.start(s);
    const stepS = orchestrator.getCurrentStep();
    assert(stepS.status === 'ready' && stepS.kind === 'S');
    stepS.state.goNext();

    expect(events).toEqual([
      { kind: 'S', name: 's1', status: 'transitionIn' },
      { kind: 'S', name: 's1', status: 'ready' },
      { kind: 'S', name: 's1', status: 'transitionOut' },
      { kind: 'T', name: 't1', status: 'transitionIn' },
      { kind: 'T', name: 't1', status: 'ready' },
    ]);
  });

  it('emits ready when store updates trigger rebuild of current step', () => {
    const orchestrator = workflow([S]);
    const s = S('main');
    orchestrator.register(s);

    const events: Array<{ kind: string; name: string; status: string }> = [];
    orchestrator.subscribe((currentStep) => {
      events.push({ kind: currentStep.kind, name: currentStep.name, status: currentStep.status });
    });

    orchestrator.start(s);
    let cur = orchestrator.getCurrentStep();
    assert(cur.status === 'ready' && cur.kind === 'S');
    expect(cur.state.count).toBe(0);

    // bump store -> rebuild -> ready
    cur.state.bump();

    cur = orchestrator.getCurrentStep();
    assert(cur.status === 'ready' && cur.kind === 'S');
    expect(cur.state.count).toBe(1);

    expect(events).toEqual([
      { kind: 'S', name: 'main', status: 'transitionIn' },
      { kind: 'S', name: 'main', status: 'ready' },
      { kind: 'S', name: 'main', status: 'ready' },
    ]);
  });

  it('emits transitionOut of current, then transitionIn and ready of previous on back()', () => {
    const orchestrator = workflow([S, T]);
    const s = S('s1');
    const t = T('t1');
    orchestrator.register([s, t]);
    orchestrator.connect(s, t);

    const events: Array<{ kind: string; name: string; status: string }> = [];
    orchestrator.subscribe((currentStep) => {
      events.push({ kind: currentStep.kind, name: currentStep.name, status: currentStep.status });
    });

    orchestrator.start(s);
    const stepS = orchestrator.getCurrentStep();
    assert(stepS.status === 'ready' && stepS.kind === 'S');
    stepS.state.goNext();

    const stepT = orchestrator.getCurrentStep();
    assert(stepT.status === 'ready' && stepT.kind === 'T');

    orchestrator.back();

    expect(events).toEqual([
      { kind: 'S', name: 's1', status: 'transitionIn' },
      { kind: 'S', name: 's1', status: 'ready' },
      { kind: 'S', name: 's1', status: 'transitionOut' },
      { kind: 'T', name: 't1', status: 'transitionIn' },
      { kind: 'T', name: 't1', status: 'ready' },
      { kind: 'T', name: 't1', status: 'transitionOut' },
      { kind: 'S', name: 's1', status: 'transitionIn' },
      { kind: 'S', name: 's1', status: 'ready' },
    ]);
  });
});
