import { describe, test } from 'vitest';

import expression from '../src';

// These tests are type-only assertions; runtime isn't exercised here.
describe('Type-safe expression<Env>', () => {
  test('valid identifiers and env shape', () => {
    type Env = { a: number; b: string };
    const expr = expression<Env, 'a === 5 ? b : "default"'>('a === 5 ? b : "default"');
    // OK: Env matches
    expr({ a: 5, b: 'test' });
    // @ts-expect-error missing required properties a/b
    expr({ c: 6 });
  });

  test('unknown identifier should error', () => {
    type Env = { a: number; b: string };
    // @ts-expect-error c is not defined in Env
    const expr2 = expression<Env, 'c === 5 ? true : false'>('c === 5 ? true : false');
    void expr2;
  });

  test('member access ignores property names, index identifiers are required', () => {
    type Env = { a: { list: number[] }; i: number };
    const expr = expression<Env, 'a.list[i + 1]'>('a.list[i + 1]');
    expr({ a: { list: [0, 5, 10] }, i: 1 });
    // @ts-expect-error i is required in Env
    expr({ a: { list: [0, 5, 10] } });
  });

  test('call and member call - top-level callee must exist', () => {
    type Env = { a: (x: number) => number };
    const e1 = expression<Env, 'a(1)'>('a(1)');
    e1({ a: (x) => x + 1 });
    // @ts-expect-error b not defined in Env
    const e2 = expression<Env, 'b()'>('b()');
    void e2;
  });
});
