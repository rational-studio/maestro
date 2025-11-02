import { z } from 'zod/v4';

export const WORKFLOW_EXPORT_SCHEMA_VERSION = '1.0.0' as const;
/**
 * Configuration and constants for the workflow module.
 * Provides shared values used across workflow utilities and logic.
 */
export const LOG_PREFIX = '[motif-ts]';

// Schemas
export const SchemaNode = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  config: z.unknown().optional(),
});
// Support both new and old edge formats for backward compatibility.
// Use discriminated union by 'kind' to ensure conditional/transform require 'expr'.
export const SchemaEdge = z.object({
  kind: z.string(),
  from: z.string(),
  to: z.string(),
  unidirectional: z.boolean(),
});
export const SchemaBase = z.object({
  schemaVersion: z.literal(WORKFLOW_EXPORT_SCHEMA_VERSION),
  libraryVersion: z.string().optional(),
  inventoryKinds: z.array(z.string()),
  nodes: z.array(SchemaNode),
  edges: z.array(SchemaEdge),
  $schema: z.string().optional(),
  $id: z.string().optional(),
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
