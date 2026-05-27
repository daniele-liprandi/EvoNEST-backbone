"use client"

import { TextBlock as TextBlockType } from '@/lib/ai-types'

export function TextBlock({ block }: { block: TextBlockType }) {
  const paragraphs = block.content.split(/\n\n+/).filter(Boolean)
  return (
    <div className="text-sm text-foreground leading-relaxed space-y-2">
      {paragraphs.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  )
}