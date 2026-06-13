"use client"

import { MessageBlock } from '@/lib/ai-types'
import { TextBlock } from './blocks/TextBlock'
import { TableBlock } from './blocks/TableBlock'
import { ChartBlock } from './blocks/ChartBlock'
import { ReadbackBlock } from './blocks/ReadbackBlock'
import MapboxScatterPlot from '@/components/plots/scatter-map'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content?: string
  blocks?: MessageBlock[]
}

interface Props {
  messages: ConversationMessage[]
  samplesData: any[]
  onFix?: (blockIndex: number) => void
  onConfirm?: (entity: string, records: Record<string, any>[]) => void
  confirmingIndex?: number
}

function BlockRenderer({
  block,
  onConfirm,
  onFix,
  confirming,
}: {
  block: MessageBlock
  onConfirm: (records: Record<string, any>[]) => void
  onFix: () => void
  confirming?: boolean
}) {
  switch (block.type) {
    case 'text': return <TextBlock block={block} />
    case 'table': return <TableBlock block={block} />
    case 'chart': return <ChartBlock block={block} />
    case 'readback':
      return <ReadbackBlock block={block} onConfirm={onConfirm} onFix={onFix} confirming={confirming} />
    default: return null
  }
}

export function ConversationCanvas({ messages, samplesData, onFix, onConfirm, confirmingIndex }: Props) {
  if (messages.length === 0) {
    return (
      <div className="relative rounded-lg overflow-hidden min-h-[300px] flex-1">
        {samplesData?.length > 0 && <MapboxScatterPlot samplesData={samplesData} />}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-5 py-3 text-center">
            <p className="text-sm font-medium">Your collection</p>
            <p className="text-xs text-muted-foreground mt-1">Ask a question above to explore</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
      {[...messages].reverse().map((msg, msgIdx) => (
        <div key={msgIdx}>
          {msg.role === 'user' ? (
            <div className="flex justify-end">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm max-w-[80%]">
                {msg.content}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {msg.blocks?.map((block, blockIdx) => (
                <div key={blockIdx} className="bg-card border rounded-lg px-3 py-2">
                  <BlockRenderer
                    block={block}
                    onConfirm={(records) => onConfirm?.(
                      block.type === 'readback' ? block.entity : 'samples',
                      records
                    )}
                    onFix={() => onFix?.(blockIdx)}
                    confirming={confirmingIndex === blockIdx}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}