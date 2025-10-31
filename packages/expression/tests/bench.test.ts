import { describe, expect, test } from 'vitest';

import expression from '../src';

describe('performance benchmarks', () => {
  test('micro benchmark: compile and evaluate', () => {
    const startCompile = performance.now();
    const fns = Array.from({ length: 100 }, (_, i) => expression(`a + ${i} * 2 - (c / 3)`));
    const compileMs = performance.now() - startCompile;

    const startEval = performance.now();
    let acc = 0;
    for (const fn of fns) {
      acc += Number(fn({ a: 1, c: 3 }));
    }
    const evalMs = performance.now() - startEval;

    // sanity checks
    expect(acc).toBeGreaterThan(0);
    expect(compileMs).toBeLessThan(2000);
    expect(evalMs).toBeLessThan(2000);
  });
});
