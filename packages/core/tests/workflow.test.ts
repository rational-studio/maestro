import { describe, expect, it, vi } from 'vitest';

import { step, workflow } from '../src';

describe('Workflow INTERNAL API', () => {
  it('pauses and resumes lifecycle', () => {
    const effectCleanup = vi.fn();
    const effect = vi.fn(() => effectCleanup);
    const transitionIn = vi.fn();
    const transitionOut = vi.fn();

    const A = step(
      { kind: 'A' },
      ({ effect: defineEffect, transitionIn: defineTransitionIn, transitionOut: defineTransitionOut }) => {
        defineEffect(effect, []);
        defineTransitionIn(transitionIn);
        defineTransitionOut(transitionOut);
        return {};
      },
    );

    const wf = workflow([A]);
    const a = A();
    wf.register(a);

    // Pause lifecycle
    wf.INTERNAL.pauseLifeCycle();

    // Start the workflow
    wf.start(a);

    // Lifecycle hooks should not be called
    expect(effect).not.toHaveBeenCalled();
    expect(transitionIn).not.toHaveBeenCalled();

    // Resume lifecycle
    wf.INTERNAL.resumeLifeCycle();

    // Re-start the workflow to trigger the lifecycle hooks
    wf.start(a);

    // Lifecycle hooks should be called
    expect(effect).toHaveBeenCalled();
    expect(transitionIn).toHaveBeenCalled();
  });
});
