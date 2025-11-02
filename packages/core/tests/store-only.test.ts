import { assert, describe, expect, it } from 'vitest';
import z from 'zod/v4';
import { type StateCreator } from 'zustand/vanilla';

import { step, workflow } from '../src';

// Combination (c): no configSchema, with createStore
// Ensures build args include `store` and no `config`, and runtime store works.
describe('Step without configSchema but with createStore', () => {
  it('provides store in build args and works without config', () => {
    type CounterStore = { count: number; inc: () => void };
    const counterStore: StateCreator<CounterStore> = (set) => ({
      count: 0,
      inc: () => set((s) => ({ count: s.count + 1 })),
    });

    const Counter = step(
      {
        kind: 'Counter',
        outputSchema: z.number(),
        createStore: counterStore,
      },
      ({ store, transitionIn, transitionOut, effect, next }) => {
        transitionIn(() => {
          console.log('transition-in', store.count);
        });

        transitionOut(() => {
          console.log('transition-out', store.count);
        });

        effect(() => {
          console.log(store.count);
        }, [store.count]);

        return {
          count: store.count,
          bump() {
            store.inc();
          },
          testNext() {
            next(store.count);
          },
        };
      },
    );

    const orchestrator = workflow([Counter]);
    const c = Counter('main');
    orchestrator.register(c);
    orchestrator.start(c);

    let curStep = orchestrator.getCurrentStep();
    assert(curStep.status === 'ready' && curStep.kind === 'Counter');
    expect(curStep.state.count).toBe(0);
    curStep.state.bump();

    curStep = orchestrator.getCurrentStep();
    assert(curStep.status === 'ready' && curStep.kind === 'Counter');

    // After bump, store count should increment
    expect(curStep.state.count).toBe(1);
    curStep.state.bump();

    curStep = orchestrator.getCurrentStep();
    assert(curStep.status === 'ready' && curStep.kind === 'Counter');
    expect(curStep.state.count).toBe(2);
  });
});
