import { formatInvalid, raiseInvalid } from './errors';
import type { Token } from './types';

const isDigit = (ch: string) => ch >= '0' && ch <= '9';
const isHex = (ch: string) => (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
const isIdentStart = (ch: string) => ch === '_' || ch === '$' || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
const isIdentPart = (ch: string) => isIdentStart(ch) || isDigit(ch);

const punctuators = new Set(['(', ')', '[', ']', '{', '}', ',', ':', '.', '?']);

const twoCharOps = new Set(['==', '!=', '>=', '<=', '&&', '||', '??']);
const threeCharOps = new Set(['===', '!==', '...']);

export interface LexerState {
  input: string;
  pos: number;
}

const createState = (input: string): LexerState => ({ input, pos: 0 });

const peek = (st: LexerState) => st.input[st.pos] ?? '';
const next = (st: LexerState) => st.input[st.pos++] ?? '';
const eof = (st: LexerState) => st.pos >= st.input.length;

const skipWhitespace = (st: LexerState) => {
  while (!eof(st)) {
    const ch = peek(st);
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\v' || ch === '\f') {
      st.pos++;
    } else {
      break;
    }
  }
};

const readNumber = (st: LexerState, startPos: number): Token => {
  let numStr = '';
  let ch = peek(st);
  while (isDigit(ch)) {
    numStr += next(st);
    ch = peek(st);
  }
  if (ch === '.') {
    numStr += next(st);
    ch = peek(st);
    while (isDigit(ch)) {
      numStr += next(st);
      ch = peek(st);
    }
  }
  if (ch === 'e' || ch === 'E') {
    numStr += next(st);
    ch = peek(st);
    if (ch === '+' || ch === '-') {
      numStr += next(st);
      ch = peek(st);
    }
    if (!isDigit(ch)) {
      // invalid exponent: keep message concise as tests expect
      raiseInvalid(st.input);
    }
    while (isDigit(ch)) {
      numStr += next(st);
      ch = peek(st);
    }
  }
  return { kind: 'number', value: numStr, pos: startPos };
};

const readString = (st: LexerState): Token => {
  const quote = next(st); // consume opening quote
  const startPos = st.pos - 1;
  let out = '';
  while (!eof(st)) {
    const ch = next(st);
    if (ch === quote) {
      return { kind: 'string', value: out, pos: startPos };
    }
    if (ch === '\\') {
      const esc = next(st);
      if (!esc) {
        raiseInvalid(st.input);
      }
      switch (esc) {
        case 'n':
          out += '\n';
          break;
        case 'r':
          out += '\r';
          break;
        case 'f':
          out += '\f';
          break;
        case 't':
          out += '\t';
          break;
        case 'v':
          out += '\v';
          break;
        case 's':
          // non-standard, treat as literal 's'
          out += 's';
          break;
        case 'u': {
          const hexStart = st.pos;
          let hex = '';
          for (let i = 0; i < 4; i++) {
            const h = next(st);
            if (!h || !isHex(h)) {
              const seq = st.input.slice(hexStart, hexStart + 4);
              const msg = `invalid unicode escape [\\u${seq}]`;
              throw new Error(formatInvalid(st.input, msg));
            }
            hex += h;
          }
          out += String.fromCharCode(parseInt(hex, 16));
          break;
        }
        default:
          // Unknown escape: treat as the char itself
          out += esc;
          break;
      }
    } else {
      out += ch;
    }
  }
  // not closed
  throw new Error(formatInvalid(st.input));
};

const readIdentifier = (st: LexerState): Token => {
  const startPos = st.pos;
  let id = next(st);
  while (!eof(st) && isIdentPart(peek(st))) {
    id += next(st);
  }
  const lowers = id.toLowerCase();
  if (lowers === 'true' || lowers === 'false') {
    return { kind: 'boolean', value: lowers, pos: startPos };
  }
  if (lowers === 'null') {
    return { kind: 'null', value: lowers, pos: startPos };
  }
  if (lowers === 'undefined') {
    return { kind: 'undefined', value: lowers, pos: startPos };
  }
  return { kind: 'identifier', value: id, pos: startPos };
};

const readOperatorOrPunct = (st: LexerState): Token => {
  const startPos = st.pos;
  const ch1 = next(st);
  const ch2 = peek(st);
  const ch3 = st.input[st.pos + 1] ?? '';

  const two = ch1 + ch2;
  const three = two + ch3;
  if (threeCharOps.has(three)) {
    st.pos += 2;
    return { kind: 'operator', value: three, pos: startPos };
  }
  if (twoCharOps.has(two)) {
    st.pos += 1;
    return { kind: 'operator', value: two, pos: startPos };
  }
  if (
    ch1 === '>' ||
    ch1 === '<' ||
    ch1 === '+' ||
    ch1 === '-' ||
    ch1 === '*' ||
    ch1 === '/' ||
    ch1 === '%' ||
    ch1 === '!' ||
    ch1 === '='
  ) {
    return { kind: 'operator', value: ch1, pos: startPos };
  }
  if (punctuators.has(ch1)) {
    return { kind: 'punct', value: ch1, pos: startPos };
  }
  // unknown single char
  return { kind: 'operator', value: ch1, pos: startPos };
};

export const tokenize = (input?: string): Token[] => {
  if (!input && input !== '') {
    // undefined or null
    raiseInvalid();
  }
  const st = createState(input ?? '');
  const tokens: Token[] = [];
  while (!eof(st)) {
    skipWhitespace(st);
    if (eof(st)) {
      break;
    }
    const ch = peek(st);
    if (ch === '\\') {
      // standalone backslash is invalid
      raiseInvalid(st.input);
    }
    if (ch === '"' || ch === "'") {
      tokens.push(readString(st));
      continue;
    }
    if (isDigit(ch)) {
      tokens.push(readNumber(st, st.pos));
      continue;
    }
    if (isIdentStart(ch)) {
      tokens.push(readIdentifier(st));
      continue;
    }
    tokens.push(readOperatorOrPunct(st));
  }
  tokens.push({ kind: 'eof', value: '', pos: st.pos });
  return tokens;
};
