import { assert, describe, expect, it } from 'vitest';
import z from 'zod/v4';

import { compoundStep, step, workflow } from '../src';

describe('CompoundStep basic composition', () => {
  const CollectEmail = step(
    {
      kind: 'CollectEmail',
      outputSchema: z.object({ email: z.email() }),
      configSchema: z.object({ emailPrompt: z.string() }),
    },
    ({ next }) => {
      return {
        collect() {
          next({ email: 'user@example.com' });
        },
      };
    },
  );

  const VerifyEmail = step(
    {
      kind: 'VerifyEmail',
      inputSchema: z.object({ email: z.email() }),
      outputSchema: z.object({ verified: z.boolean() }),
      configSchema: z.object({ allowedDomain: z.string().optional() }),
    },
    ({ input, config, next }) => {
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
    ({ input, next }) => {
      return {
        display() {
          next({});
          return { verified: input.verified };
        },
      };
    },
  );

  const AfterCompound = step(
    {
      kind: 'AfterCompound',
      inputSchema: z.object({}),
    },
    ({ input }) => {
      return {
        done() {
          return input;
        },
      };
    },
  );

  it('works as a single step and forwards exit output', () => {
    const SubFlow = compoundStep([CollectEmail, VerifyEmail, DisplayResult, AfterCompound]);
    const orchestrator = workflow([CollectEmail, VerifyEmail, DisplayResult, AfterCompound, SubFlow]);

    const sub = SubFlow('EmailVerification');
    const collect = CollectEmail({ emailPrompt: 'Enter your email' });
    const verify = VerifyEmail({ allowedDomain: 'example.com' });
    const display = DisplayResult('Display');

    sub
      .register([collect, verify, display])
      .connect(collect, verify)
      .connect(verify, display)
      .setEntry(collect)
      .setExit(display);

    const after = AfterCompound('After');
    orchestrator.register([sub, after]);
    orchestrator.connect(sub, after);

    orchestrator.start(sub);
    const cmp = orchestrator.getCurrentStep();
    assert(cmp.kind === 'compound');

    if (cmp.kind !== 'compound') {
      throw new Error('Expected compound');
    }
    const inner = cmp.state.getInnerState();
    inner.collect();
    const s1 = orchestrator.getCurrentStep();
    if (s1.kind !== 'compound') {
      throw new Error('Expected compound');
    }
    s1.state.getInnerState().verify();
    const s2 = orchestrator.getCurrentStep();
    if (s2.kind !== 'compound') {
      throw new Error('Expected compound');
    }
    s2.state.getInnerState().display();

    // After exit, outer should advance to AfterCompound
    const nextStep = orchestrator.getCurrentStep();
    assert(nextStep.kind === 'AfterCompound');
    const res = nextStep.state.done();
    expect(res).toEqual({});
  });

  it('back() returns to CompoundStep and re-enters inner entry', () => {
    const SubFlow = compoundStep([CollectEmail, VerifyEmail, DisplayResult, AfterCompound]);
    const orchestrator = workflow([CollectEmail, VerifyEmail, DisplayResult, AfterCompound, SubFlow]);

    const sub = SubFlow('EmailVerification');
    const collect = CollectEmail({ emailPrompt: 'Enter your email' });
    const verify = VerifyEmail({ allowedDomain: 'example.com' });
    const display = DisplayResult('Display');
    sub
      .register([collect, verify, display])
      .connect(collect, verify)
      .connect(verify, display)
      .setEntry(collect)
      .setExit(display);

    const after = AfterCompound('After');
    orchestrator.register([sub, after]);
    orchestrator.connect(sub, after);

    orchestrator.start(sub);
    let cs = orchestrator.getCurrentStep();
    if (cs.kind !== 'compound') {
      throw new Error('Expected compound');
    }
    cs.state.getInnerState().collect();
    cs = orchestrator.getCurrentStep();
    if (cs.kind !== 'compound') {
      throw new Error('Expected compound');
    }
    cs.state.getInnerState().verify();
    cs = orchestrator.getCurrentStep();
    if (cs.kind !== 'compound') {
      throw new Error('Expected compound');
    }
    cs.state.getInnerState().display();

    // now at AfterCompound
    orchestrator.back();
    const currentCmp = orchestrator.getCurrentStep();
    assert(currentCmp.kind === 'compound');
    // inner should be at entry again
    if (currentCmp.kind !== 'compound') {
      throw new Error('Expected compound');
    }
    const innerState = currentCmp.state.getInnerState();
    expect(typeof innerState.collect).toBe('function');
  });
});
