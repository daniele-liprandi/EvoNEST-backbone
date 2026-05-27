import { z } from 'zod'

export const TextBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
})

export const TableBlockSchema = z.object({
  type: z.literal('table'),
  entity: z.enum(['samples', 'traits']),
  data: z.array(z.record(z.string(), z.any())),
  totalCount: z.number(),
  filterUrl: z.string(),
})

export const ChartBlockSchema = z.object({
  type: z.literal('chart'),
  chartType: z.enum(['bar', 'scatter', 'line', 'treemap']),
  title: z.string(),
  data: z.array(z.any()),
  config: z.record(z.string(), z.any()),
})

export const ReadbackBlockSchema = z.object({
  type: z.literal('readback'),
  entity: z.enum(['samples', 'traits']),
  records: z.array(z.record(z.string(), z.any())),
  pendingCreate: z.literal(true),
})

export const MessageBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  TableBlockSchema,
  ChartBlockSchema,
  ReadbackBlockSchema,
])

export const AgentResponseSchema = z.object({
  blocks: z.array(MessageBlockSchema),
})

export type TextBlock = z.infer<typeof TextBlockSchema>
export type TableBlock = z.infer<typeof TableBlockSchema>
export type ChartBlock = z.infer<typeof ChartBlockSchema>
export type ReadbackBlock = z.infer<typeof ReadbackBlockSchema>
export type MessageBlock = z.infer<typeof MessageBlockSchema>
export type AgentResponse = z.infer<typeof AgentResponseSchema>