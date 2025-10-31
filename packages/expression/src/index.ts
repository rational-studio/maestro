import { formatInvalid, formatParseError } from './errors';
import { evaluate } from './eval';
import { tokenize } from './lexer';
import { parse } from './parser';
import type { AssertValid, ASTNode, Env as RuntimeEnv } from './types';

// =============================
// Runtime compile implementation
// =============================
type Compiled = (env: RuntimeEnv) => unknown;

const cache = new Map<string, Compiled>();

const compileImpl = (expr?: string): Compiled => {
  if (cache.has(expr ?? '')) {
    return cache.get(expr ?? '')!;
  }

  // special case: undefined input
  if (!expr && expr !== '') {
    throw new Error(formatInvalid());
  }

  let ast: ASTNode | null = null;
  try {
    const tokens = tokenize(expr);
    // special case: leading ']'
    if (tokens.length > 0 && tokens[0].kind === 'punct' && tokens[0].value === ']') {
      const fn: Compiled = () => undefined;
      cache.set(expr, fn);
      return fn;
    }
    ast = parse(tokens, expr);
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(formatInvalid(expr));
  }

  if (!ast) {
    // grammar error
    throw new Error(formatParseError(expr));
  }

  const fn: Compiled = (env: RuntimeEnv) => evaluate(ast, env ?? {});
  cache.set(expr, fn);
  return fn;
};

// =====================================
// Public API: type-safe expression<Env>
// =====================================

// Overloads: typed generic for compile-time validation, and a runtime-only fallback
export default function expression<const Env extends Record<string, unknown>, S extends string>(
  expr: AssertValid<S, keyof Env>,
): (env: Env) => unknown;
export default function expression(expr?: string): (env: RuntimeEnv) => unknown;

export default function expression<Env extends Record<string, unknown>>(expr?: string): (env: Env) => unknown {
  const fn = compileImpl(expr);
  return fn as unknown as (env: Env) => unknown;
}

// Also export a named helper for non-generic usage if needed
export const compile = compileImpl;
