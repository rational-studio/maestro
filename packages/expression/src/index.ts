import { formatInvalid, formatParseError } from './errors';
import { evaluate } from './eval';
import { tokenize } from './lexer';
import { parse } from './parser';
import type { ASTNode, Env as RuntimeEnv } from './types';

type Compiled = (env: RuntimeEnv) => unknown;

const cache = new Map<string, Compiled>();

const expression = (expr?: string): Compiled => {
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

export default expression;
