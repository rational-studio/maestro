import { assert, describe, expect, it, vi } from 'vitest';
import z from 'zod';
import { type StateCreator } from 'zustand/vanilla';

import { step, workflow } from '../src';

describe('effects', () => {
  const storeCreator: StateCreator<{ count: number; inc: () => void }> = (set) => ({
    count: 0,
    inc: () => set((prev) => ({ count: prev.count + 1 })),
  });

  it('should run effect only once with an empty dep array', () => {
    const effectCb = vi.fn();

    const Step = step(
      {
        kind: 'Step',
        createStore: storeCreator,
      },
      ({ effect, store }) => {
        effect(effectCb, []);
        return {
          inc: () => store.inc(),
        };
      },
    );

    const orchestrator = workflow([Step]);
    const first = Step('first');
    orchestrator.register([first]);
    orchestrator.start(first);

    const currentStep = orchestrator.getCurrentStep();
    assert(currentStep.status === 'ready' && currentStep.kind === 'Step');

    // Rebuild the step by updating the store
    currentStep.state.inc();
    currentStep.state.inc();
    currentStep.state.inc();

    expect(effectCb).toHaveBeenCalledTimes(1);
  });

  it('should rerun effect when dependencies change', () => {
    const effectCb = vi.fn();

    const Step = step(
      {
        kind: 'Step',
        createStore: storeCreator,
      },
      ({ effect, store }) => {
        effect(() => {
          effectCb(store.count);
        }, [store.count]);
        return {
          inc: () => store.inc(),
        };
      },
    );

    const orchestrator = workflow([Step]);
    const first = Step('first');
    orchestrator.register([first]);
    orchestrator.start(first);

    const currentStep = orchestrator.getCurrentStep();
    assert(currentStep.status === 'ready' && currentStep.kind === 'Step');
    expect(effectCb).toHaveBeenCalledTimes(1);
    expect(effectCb).toHaveBeenCalledWith(0);

    // Rebuild with same input
    currentStep.state.inc();
    expect(effectCb).toHaveBeenCalledTimes(2);
    expect(effectCb).toHaveBeenCalledWith(1);
  });

  it('should run effect on every rebuild when deps are not provided', () => {
    const effectCb = vi.fn();

    const Step = step(
      {
        kind: 'Step',
        createStore: storeCreator,
      },
      ({ effect, store }) => {
        effect(effectCb);
        return {
          inc: () => store.inc(),
        };
      },
    );

    const orchestrator = workflow([Step]);
    const first = Step('first');
    orchestrator.register([first]);
    orchestrator.start(first);

    const currentStep = orchestrator.getCurrentStep();
    assert(currentStep.status === 'ready' && currentStep.kind === 'Step');

    // Rebuild the step
    currentStep.state.inc();
    currentStep.state.inc();
    currentStep.state.inc();

    expect(effectCb).toHaveBeenCalledTimes(4);
  });
});
