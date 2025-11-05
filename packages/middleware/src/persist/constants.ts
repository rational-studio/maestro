import { z } from 'zod/v4';

export const WORKFLOW_EXPORT_SCHEMA_VERSION = '1.0.0' as const;
// Schemas
export const SchemaNode = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  config: z.unknown().optional(),
});

export const SchemaEdge = z.object({
  kind: z.string(),
  from: z.string(),
  to: z.string(),
  unidirectional: z.boolean(),
  config: z.unknown().optional(),
});

export const SchemaBase = z.object({
  schemaVersion: z.literal(WORKFLOW_EXPORT_SCHEMA_VERSION),
  nodes: z.array(SchemaNode),
  edges: z.array(SchemaEdge),
});
export const SchemaBasic = SchemaBase.extend({ format: z.literal('motif-ts/basic') });
export const SchemaFullState = SchemaBase.extend({
  format: z.literal('motif-ts/full'),
  state: z.object({
    current: z.object({
      nodeId: z.string().nullable().optional(),
      status: z.union([
        z.literal('notStarted'),
        z.literal('transitionIn'),
        z.literal('ready'),
        z.literal('transitionOut'),
      ]),
      input: z.any().optional(),
    }),
    history: z.array(z.object({ nodeId: z.string(), input: z.any().optional() })),
    stores: z.record(z.string(), z.any()),
  }),
});
