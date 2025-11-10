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
    assert(currentStep.kind === 'Step');

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
    assert(currentStep.kind === 'Step');
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
    assert(currentStep.kind === 'Step');

    // Rebuild the step
    currentStep.state.inc();
    currentStep.state.inc();
    currentStep.state.inc();

    expect(effectCb).toHaveBeenCalledTimes(4);
  });

  describe('pause and resume', () => {
    const storeCreator: StateCreator<{ count: number; inc: () => void }> = (set) => ({
      count: 0,
      inc: () => set((prev) => ({ count: prev.count + 1 })),
    });

    it('should not run effects when paused, and should resume', () => {
      const effectCb = vi.fn();
      const cleanupCb = vi.fn();

      const Step = step(
        {
          kind: 'Step',
          createStore: storeCreator,
        },
        ({ effect, store }) => {
          effect(() => {
            effectCb(store.count);
            return cleanupCb;
          }, [store.count]);
          return {
            inc: () => store.inc(),
          };
        },
      );
      const first = Step('first');
      const orchestrator = workflow([Step]);

      orchestrator.register([first]);
      orchestrator.start(first);

      const currentStep = orchestrator.getCurrentStep();
      assert(currentStep.kind === 'Step');
      expect(effectCb).toHaveBeenCalledTimes(1);
      expect(effectCb).toHaveBeenCalledWith(0);

      orchestrator.$$INTERNAL.pauseLifeCycle();
      expect(cleanupCb).toHaveBeenCalledTimes(1);

      // Should not trigger effect
      currentStep.state.inc();
      expect(effectCb).toHaveBeenCalledTimes(1);

      orchestrator.$$INTERNAL.resumeLifeCycle();
      expect(effectCb).toHaveBeenCalledTimes(2);
      expect(effectCb).toHaveBeenCalledWith(1);

      // Should trigger effect again
      currentStep.state.inc();
      expect(effectCb).toHaveBeenCalledTimes(3);
      expect(effectCb).toHaveBeenCalledWith(2);
    });

    it('should be able to query pause state', () => {
      const Step = step({ kind: 'Step' }, () => ({}));
      const orchestrator = workflow([Step]);
      const first = Step('first');
      orchestrator.register([first]);
      orchestrator.start(first);

      expect(orchestrator.$$INTERNAL.isLifeCyclePaused()).toBe(false);
      orchestrator.$$INTERNAL.pauseLifeCycle();
      expect(orchestrator.$$INTERNAL.isLifeCyclePaused()).toBe(true);
      orchestrator.$$INTERNAL.resumeLifeCycle();
      expect(orchestrator.$$INTERNAL.isLifeCyclePaused()).toBe(false);
    });

    it('should handle multiple pause/resume calls', () => {
      const effectCb = vi.fn();
      const cleanupCb = vi.fn();

      const Step = step(
        {
          kind: 'Step',
          createStore: storeCreator,
        },
        ({ effect, store }) => {
          effect(() => {
            effectCb(store.count);
            return cleanupCb;
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
      assert(currentStep.kind === 'Step');
      expect(effectCb).toHaveBeenCalledTimes(1);

      orchestrator.$$INTERNAL.pauseLifeCycle();
      orchestrator.$$INTERNAL.pauseLifeCycle(); // second call should be a no-op
      expect(cleanupCb).toHaveBeenCalledTimes(1);

      currentStep.state.inc();
      expect(effectCb).toHaveBeenCalledTimes(1);

      orchestrator.$$INTERNAL.resumeLifeCycle();
      orchestrator.$$INTERNAL.resumeLifeCycle(); // second call should be a no-op
      expect(effectCb).toHaveBeenCalledTimes(2);

      currentStep.state.inc();
      expect(effectCb).toHaveBeenCalledTimes(3);
    });
  });
});
