export type Env = Record<string, unknown>;

export type TokenKind =
  | 'number'
  | 'string'
  | 'boolean'
  | 'null'
  | 'undefined'
  | 'identifier'
  | 'punct'
  | 'operator'
  | 'eof';

export interface Token {
  kind: TokenKind;
  value: string;
  pos: number;
}

export type ASTNode =
  | LiteralNode
  | IdentifierNode
  | UnaryNode
  | BinaryNode
  | LogicalNode
  | ConditionalNode
  | MemberNode
  | CallNode
  | ArrayNode
  | ObjectNode;

export interface LiteralNode {
  type: 'Literal';
  value: unknown;
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

export interface UnaryNode {
  type: 'UnaryExpression';
  operator: '+' | '-' | '!';
  argument: ASTNode;
}

export interface BinaryNode {
  type: 'BinaryExpression';
  operator: '+' | '-' | '*' | '/' | '%' | '>' | '<' | '>=' | '<=' | '==' | '!=' | '===' | '!==';
  left: ASTNode;
  right: ASTNode;
}

export interface LogicalNode {
  type: 'LogicalExpression';
  operator: '&&' | '||' | '??';
  left: ASTNode;
  right: ASTNode;
}

export interface ConditionalNode {
  type: 'ConditionalExpression';
  test: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}

export interface MemberNode {
  type: 'MemberExpression';
  object: ASTNode;
  property: ASTNode; // Identifier or Literal(string/number)
  computed: boolean;
}

export interface CallNode {
  type: 'CallExpression';
  callee: ASTNode; // Identifier or MemberExpression
  args: ASTNode[];
}

export interface ArrayNode {
  type: 'ArrayExpression';
  elements: ASTNode[];
}

export interface ObjectProperty {
  key: string; // only identifier or string literal keys are supported
  value: ASTNode;
}

export interface ObjectNode {
  type: 'ObjectExpression';
  properties: Array<ObjectProperty | SpreadElement>;
}

export interface SpreadElement {
  type: 'SpreadElement';
  argument: ASTNode;
}

// Type-level helpers to extract top-level identifiers from an expression string
// and assert they are all keys of the provided Env type.

// Basic character sets
type Lower =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z';
type Upper =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z';
type IdentStartChar = Lower | Upper | '_' | '$';

// Reserved literal keywords we should ignore as identifiers
type Reserved = 'true' | 'false' | 'null' | 'undefined';

// Strip quoted strings to avoid false identifier matches inside them
type StripQuotes<S extends string> = S extends `${infer P}"${infer _}"${infer R}`
  ? StripQuotes<`${P}${R}`>
  : S extends `${infer P}'${infer _}'${infer R}`
    ? StripQuotes<`${P}${R}`>
    : S extends `${infer P}\`${infer _}\`${infer R}`
      ? StripQuotes<`${P}${R}`>
      : S;

// Determine if token is an identifier (first char letter/_/$) and not a reserved literal
type IdentifierWord<S extends string> = S extends ''
  ? never
  : S extends Reserved
    ? never
    : S extends `${infer F}${string}`
      ? F extends IdentStartChar
        ? S
        : never
      : never;

// Extract identifiers from a segment, with option to skip the first identifier
type ExtractSegment<Seg extends string, SkipFirstId extends boolean> = Seg extends ''
  ? never
  : Seg extends `${infer A} ${infer R}`
    ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
    : Seg extends `${infer A}\n${infer R}`
      ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
      : Seg extends `${infer A}\t${infer R}`
        ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
        : Seg extends `${infer A}\r${infer R}`
          ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
          : Seg extends `${infer A}(${infer R}`
            ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
            : Seg extends `${infer A})${infer R}`
              ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
              : Seg extends `${infer A}[${infer R}`
                ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                : Seg extends `${infer A}]${infer R}`
                  ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                  : Seg extends `${infer A}{${infer R}`
                    ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                    : Seg extends `${infer A}}${infer R}`
                      ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                      : Seg extends `${infer A}+${infer R}`
                        ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                        : Seg extends `${infer A}-${infer R}`
                          ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                          : Seg extends `${infer A}*${infer R}`
                            ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                            : Seg extends `${infer A}/${infer R}`
                              ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                              : Seg extends `${infer A}%${infer R}`
                                ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                                : Seg extends `${infer A}>${infer R}`
                                  ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                                  : Seg extends `${infer A}<${infer R}`
                                    ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                                    : Seg extends `${infer A}=${infer R}`
                                      ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                                      : Seg extends `${infer A}!${infer R}`
                                        ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                                        : Seg extends `${infer A}&${infer R}`
                                          ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                                          : Seg extends `${infer A}|${infer R}`
                                            ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                                            : Seg extends `${infer A},${infer R}`
                                              ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                                              : Seg extends `${infer A}:${infer R}`
                                                ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                                                : Seg extends `${infer A}?${infer R}`
                                                  ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                                                  : Seg extends `${infer A};${infer R}`
                                                    ? ExtractSegment<A, SkipFirstId> | ExtractSegment<R, false>
                                                    : SkipFirstId extends true
                                                      ? IdentifierWord<Seg> extends never
                                                        ? never
                                                        : never
                                                      : IdentifierWord<Seg>;

// Extract top-level identifiers across the expression, skipping the first after each '.'
type ExtractIdentifiers<S extends string> = S extends `${infer A}.${infer R}`
  ? ExtractSegment<A, false> | ExtractIdentifiersPostDot<R>
  : ExtractSegment<S, false>;

type ExtractIdentifiersPostDot<S extends string> = S extends `${infer A}.${infer R}`
  ? ExtractSegment<A, true> | ExtractIdentifiersPostDot<R>
  : ExtractSegment<S, true>;

// Validate that extracted identifiers are keys of Env
type UnknownVars<S extends string, Keys extends string | number | symbol> = Exclude<
  ExtractIdentifiers<StripQuotes<S>>,
  Keys & string
>;

export type AssertValid<S extends string, Keys extends string | number | symbol> =
  UnknownVars<S, Keys> extends never ? S : never;
