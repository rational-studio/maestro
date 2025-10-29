// React-like lifecycle context for the current step
// Symbol used to mark when an out-cleanup array has already been executed on back.
// @internal
export const CLEANUP_ARRAY_EXECUTED: unique symbol = Symbol('cleanupArrayExecuted');
