import { assert, describe, expect, it } from 'vitest';
import z from 'zod/v4';
import { type StateCreator } from 'zustand/vanilla';

import { step, workflow } from '../src';

// This suite converts the strict-typed-demo example into deterministic tests.
// It covers positive, negative, and edge scenarios, including Zod validation errors.

describe('strict-typed-demo workflow', () => {
  const collectEmailStore: StateCreator<{ counter: number; increment: () => void }> = (set) => ({
    counter: 0,
    increment: () => set((prev) => ({ counter: prev.counter + 1 })),
  });

  const CollectEmail = step(
    {
      kind: 'CollectEmail',
      outputSchema: z.object({
        email: z.email(),
      }),
      configSchema: z.object({
        emailPrompt: z.string(),
      }),
      createStore: collectEmailStore,
    },
    ({ transitionIn, transitionOut, effect, config, next, store }) => {
      transitionIn(() => {});
      transitionOut(() => {});
      effect(() => undefined);
      return {
        collect() {
          next({ email: 'user@example.com' });
        },
        // Negative path: intentionally emit an invalid email to trigger Zod validation error
        collectInvalid() {
          next({ email: 'not-an-email' as unknown as string });
        },
      };
    },
  );

  const VerifyEmail = step(
    {
      kind: 'VerifyEmail',
      inputSchema: z.object({
        email: z.email(),
      }),
      outputSchema: z.object({
        verified: z.boolean(),
      }),
      configSchema: z.object({
        allowedDomain: z.string().optional(),
      }),
    },
    ({ transitionIn, transitionOut, input, config, next }) => {
      transitionIn(() => {});
      transitionOut(() => {});
      return {
        verify() {
          const domain = input.email.split('@')[1] || '';
          const ok = !config.allowedDomain || domain === config.allowedDomain;
          next({ verified: ok });
        },
      };
    },
  );

  const DisplayResult = step(
    {
      kind: 'DisplayResult',
      inputSchema: z.object({ verified: z.boolean() }),
      outputSchema: z.object({}),
    },
    ({ transitionIn, transitionOut, input }) => {
      transitionIn(() => {});
      transitionOut(() => {});
      return {
        display() {
          return { verified: input.verified };
        },
      };
    },
  );

  it('verifies email successfully when allowedDomain matches', () => {
    const orchestrator = workflow([CollectEmail, VerifyEmail, DisplayResult]);

    const collect = CollectEmail({ emailPrompt: 'Please enter your email' });
    const verify = VerifyEmail({ allowedDomain: 'example.com' });
    const display = DisplayResult('DisplayResultMain');

    orchestrator.register([collect, verify, display]);
    orchestrator.connect(collect, verify);
    orchestrator.connect(verify, display);

    orchestrator.start(collect);
    const collectStep = orchestrator.getCurrentStep();
    assert(collectStep.status === 'ready' && collectStep.kind === 'CollectEmail');
    collectStep.state.collect();

    const verifyStep = orchestrator.getCurrentStep();
    assert(verifyStep.status === 'ready' && verifyStep.kind === 'VerifyEmail');
    verifyStep.state.verify();

    const displayStep = orchestrator.getCurrentStep();
    assert(displayStep.status === 'ready' && displayStep.kind === 'DisplayResult');
    const result = displayStep.state.display();
    expect(result.verified).toBe(true);
  });

  it('fails verification when allowedDomain mismatches', () => {
    const orchestrator = workflow([CollectEmail, VerifyEmail, DisplayResult]);

    const collect = CollectEmail({ emailPrompt: 'Please enter your email' });
    const verify = VerifyEmail({ allowedDomain: 'gmail.com' });
    const display = DisplayResult('DisplayResultMain');

    orchestrator.register([collect, verify, display]);
    orchestrator.connect(collect, verify);
    orchestrator.connect(verify, display);

    orchestrator.start(collect);

    const collectStep = orchestrator.getCurrentStep();
    assert(collectStep.status === 'ready' && collectStep.kind === 'CollectEmail');
    collectStep.state.collect();

    const verifyStep = orchestrator.getCurrentStep();
    assert(verifyStep.status === 'ready' && verifyStep.kind === 'VerifyEmail');
    verifyStep.state.verify();

    const displayStep = orchestrator.getCurrentStep();
    assert(displayStep.status === 'ready' && displayStep.kind === 'DisplayResult');
    const result = displayStep.state.display();
    expect(result.verified).toBe(false);
  });

  it('defaults to success when allowedDomain is undefined', () => {
    const orchestrator = workflow([CollectEmail, VerifyEmail, DisplayResult]);

    const collect = CollectEmail({ emailPrompt: 'Please enter your email' });
    const verify = VerifyEmail({});
    const display = DisplayResult('DisplayResultMain');

    orchestrator.register([collect, verify, display]);
    orchestrator.connect(collect, verify);
    orchestrator.connect(verify, display);

    orchestrator.start(collect);
    const collectStep = orchestrator.getCurrentStep();
    assert(collectStep.status === 'ready' && collectStep.kind === 'CollectEmail');
    collectStep.state.collect();

    const verifyStep = orchestrator.getCurrentStep();
    assert(verifyStep.status === 'ready' && verifyStep.kind === 'VerifyEmail');
    verifyStep.state.verify();

    const displayStep = orchestrator.getCurrentStep();
    assert(displayStep.status === 'ready' && displayStep.kind === 'DisplayResult');
    const result = displayStep.state.display();
    expect(result.verified).toBe(true);
  });

  it('throws a Zod validation error when Collect emits an invalid email', () => {
    const orchestrator = workflow([CollectEmail, VerifyEmail]);

    const collect = CollectEmail({ emailPrompt: 'Please enter your email' });
    const verify = VerifyEmail({ allowedDomain: 'example.com' });

    orchestrator.register([collect, verify]);
    orchestrator.connect(collect, verify);

    orchestrator.start(collect);
    const collectStep = orchestrator.getCurrentStep();
    assert(collectStep.status === 'ready' && collectStep.kind === 'CollectEmail');
    // When Collect emits invalid email, Motif-ts should throw on outputSchema.parse
    expect(() => collectStep.state.collectInvalid()).toThrow();
  });
});
