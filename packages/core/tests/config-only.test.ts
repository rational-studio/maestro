import { assert, describe, expect, it } from 'vitest';
import z from 'zod/v4';

import { step, workflow } from '../src';

// Combination (b): configSchema present, no createStore
// Ensures build args include `config` but not `store`.
describe('Step with configSchema and no store', () => {
  it('provides config in build args and no store', () => {
    const WithConfig = step(
      {
        kind: 'WithConfig',
        outputSchema: z.string(),
        configSchema: z.object({ greet: z.string() }),
      },
      ({ config, transitionIn, transitionOut, effect }) => {
        transitionIn(() => {});
        transitionOut(() => {});
        effect(() => undefined);
        return {
          run() {
            return `Hello, ${config.greet}!`;
          },
        };
      },
    );

    const orchestrator = workflow([WithConfig]);
    const node = WithConfig('main', { greet: 'World' });
    orchestrator.register(node);
    orchestrator.start(node);

    const curStep = orchestrator.getCurrentStep();
    assert(curStep.kind === 'WithConfig');
    const res = curStep.state.run();
    expect(res).toBe('Hello, World!');
  });
});
