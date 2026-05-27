"use client"

import { ReadbackBlock as ReadbackBlockType } from '@/lib/ai-types'
import { Button } from '@/components/ui/button'

interface Props {
  block: ReadbackBlockType
  onConfirm: (records: Record<string, any>[]) => void
  onFix: () => void
  confirming?: boolean
}

export function ReadbackBlock({ block, onConfirm, onFix, confirming }: Props) {
  const { records, entity } = block
  if (!records.length) return null
  const columns = Object.keys(records[0]).filter((k) => k !== '_id')

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Review these {records.length} {entity} - type a correction or confirm to save:
      </p>

      <div className="hidden md:block overflow-x-auto rounded-md border text-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground capitalize">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2">{String(row[col] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2">
        {records.map((row, i) => (
          <div key={i} className="rounded-md border p-3 space-y-1 border-l-2 border-l-primary">
            <p className="font-medium text-sm">{(row as any).name ?? (row as any).type ?? `Record ${i + 1}`}</p>
            <p className="text-xs text-muted-foreground">
              {columns.filter((c) => c !== 'name').map((c) => `${c}: ${(row as any)[c] ?? '—'}`).join(' · ')}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onConfirm(records as Record<string, any>[])}
          disabled={confirming}
          className="bg-green-700 hover:bg-green-600 text-white"
        >
          {confirming ? 'Saving…' : 'Confirm and save'}
        </Button>
        <Button size="sm" variant="outline" onClick={onFix}>
          Fix
        </Button>
      </div>
    </div>
  )
}