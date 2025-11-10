import { step, workflow } from '@motif-ts/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import z from 'zod';

import { devtools } from '../src';

type DevtoolsConn = {
  init: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  subscribe: (cb: (msg: any) => void) => () => void;
  _sub?: (msg: any) => void;
};

function createMockExtension() {
  const conn: DevtoolsConn = {
    init: vi.fn(),
    send: vi.fn(),
    subscribe: (cb: (msg: any) => void) => {
      conn._sub = cb;
      return () => void 0;
    },
  };
  const ext = { connect: vi.fn(() => conn) } as any;
  (globalThis as any).window = { __REDUX_DEVTOOLS_EXTENSION__: ext } as any;
  return { ext, conn };
}

function clearWindow() {
  (globalThis as any).window = {} as any;
}

describe('devtools middleware', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    clearWindow();
  });

  it('returns original workflow when extension is missing', () => {
    // No extension available
    clearWindow();

    const A = step({ kind: 'A', outputSchema: z.number() }, ({ next }) => ({ go: (n: number) => next(n) }));
    const B = step({ kind: 'B', inputSchema: z.number() }, ({ input }) => ({ echo: () => input }));

    const o = workflow([A, B]);
    const a = A('a');
    const b = B('b');
    o.register([a, b]);
    o.connect(a, b);

    const wrapped = devtools(o);
    // With no extension, the middleware returns the original workflow reference
    expect(wrapped).toBe(o);
  });

  it('initializes and sends snapshots on transitions; supports JUMP_TO_STATE', () => {
    const { ext, conn } = createMockExtension();

    const A = step({ kind: 'A', outputSchema: z.number() }, ({ next }) => ({ go: (n: number) => next(n) }));
    const B = step({ kind: 'B', inputSchema: z.number() }, ({ input }) => ({ echo: () => input }));

    const o = workflow([A, B]);
    const a = A('a');
    const b = B('b');
    o.register([a, b]);
    o.connect(a, b);

    const wrapped = devtools(o);
    expect(ext.connect).toHaveBeenCalledTimes(1);

    // Start and check first recorded snapshot via send
    wrapped.start(a);
    expect(conn.init).toHaveBeenCalledTimes(1);
    const firstSendState = conn.send.mock.calls[0]?.[1];
    expect(firstSendState.current.kind).toBe('A');
    expect(firstSendState.current.name).toBe('a');
    expect(Array.isArray(firstSendState.history)).toBe(true);
    expect(typeof firstSendState.stores).toBe('object');

    // Transition to B; should send at least one snapshot
    const sA = wrapped.getCurrentStep();
    expect(sA.kind).toBe('A');
    (sA.state as any).go(1);
    expect(conn.send).toHaveBeenCalled();
    const lastSendState = conn.send.mock.calls[conn.send.mock.calls.length - 1]?.[1];
    expect(lastSendState.current.kind).toBe('B');

    // Time travel back to initial snapshot using JUMP_TO_STATE
    conn._sub?.({ type: 'DISPATCH', payload: { type: 'JUMP_TO_STATE' }, state: JSON.stringify(firstSendState) });
    const afterJump = wrapped.getCurrentStep();
    expect(afterJump.kind).toBe('A');
    expect(afterJump.name).toBe('a');
  });

  it('handles JUMP_TO_ACTION, ROLLBACK, and IMPORT_STATE', () => {
    const { conn } = createMockExtension();

    const A = step({ kind: 'A', outputSchema: z.number() }, ({ next }) => ({ go: (n: number) => next(n) }));
    const B = step({ kind: 'B', inputSchema: z.number() }, ({ input }) => ({ echo: () => input }));

    const o = workflow([A, B]);
    const a = A('a');
    const b = B('b');
    o.register([a, b]);
    o.connect(a, b);

    const wrapped = devtools(o);
    wrapped.start(a);
    const snapA = conn.send.mock.calls[0]?.[1];
    const sA = wrapped.getCurrentStep();
    expect(sA.kind).toBe('A');
    (sA.state as any).go(2);
    const snapB = conn.send.mock.calls[conn.send.mock.calls.length - 1]?.[1];
    expect(snapB.current.kind).toBe('B');

    // JUMP_TO_ACTION: provide lifted state with computedStates
    conn._sub?.({
      type: 'DISPATCH',
      payload: {
        type: 'JUMP_TO_ACTION',
        actionId: 0,
        nextLiftedState: { computedStates: [{ state: snapA }, { state: snapB }] },
      },
    });
    expect(wrapped.getCurrentStep().kind).toBe('A');

    // ROLLBACK to A
    conn._sub?.({ type: 'DISPATCH', payload: { type: 'ROLLBACK' }, state: JSON.stringify(snapA) });
    expect(wrapped.getCurrentStep().kind).toBe('A');

    // IMPORT_STATE to B (index 1)
    conn._sub?.({
      type: 'DISPATCH',
      payload: {
        type: 'IMPORT_STATE',
        nextLiftedState: { computedStates: [{ state: snapA }, { state: snapB }], currentStateIndex: 1 },
      },
    });
    expect(wrapped.getCurrentStep().kind).toBe('B');
  });

  it('restoration pauses lifecycle, runs cleanup once, and resumes effects deterministically', () => {
    const { conn } = createMockExtension();

    const cleanupSpy = vi.fn();
    const effectSpy = vi.fn();

    const A = step({ kind: 'A', outputSchema: z.number() }, ({ next }) => ({ go: (n: number) => next(n) }));
    const B = step(
      {
        kind: 'B',
        inputSchema: z.number(),
        createStore: (set: any) => ({ count: 0, inc: () => set((p: any) => ({ count: p.count + 1 })) }),
      },
      ({ store, effect }: any) => {
        effect(() => {
          effectSpy(store.count);
          return cleanupSpy;
        }, [store.count]);
        return { inc: () => store.inc() };
      },
    );

    const o = workflow([A, B]);
    const a = A('a');
    const b = B('b');
    o.register([a, b]);
    o.connect(a, b);

    const wrapped = devtools(o);
    wrapped.start(a);
    // Transition to B
    const sA = wrapped.getCurrentStep();
    expect(sA.kind).toBe('A');
    (sA.state as any).go(1);
    const sB = wrapped.getCurrentStep();
    expect(sB.kind).toBe('B');
    // First effect run
    expect(effectSpy).toHaveBeenCalledTimes(1);
    expect(effectSpy).toHaveBeenCalledWith(0);

    // Change store, capture snapshot
    (sB.state as any).inc();
    const snapB = conn.send.mock.calls[conn.send.mock.calls.length - 1]?.[1];
    expect(snapB.current.kind).toBe('B');

    // Reset spies to only measure restoration side-effects
    cleanupSpy.mockClear();
    effectSpy.mockClear();

    // Time travel to B snapshot; lifecycle pause should run cleanup once, resume should run effect once
    conn._sub?.({ type: 'DISPATCH', payload: { type: 'JUMP_TO_STATE' }, state: JSON.stringify(snapB) });
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
    expect(effectSpy).toHaveBeenCalledTimes(1);
    // Effect after restore should reflect latest store count (1)
    expect(effectSpy).toHaveBeenLastCalledWith(1);
  });
});
