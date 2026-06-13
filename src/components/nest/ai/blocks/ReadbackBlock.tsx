"use client"

import { ReadbackBlock as ReadbackBlockType } from '@/lib/ai-types'
import { Button } from '@/components/ui/button'

interface Props {
  block: ReadbackBlockType
  onConfirm: (records: Record<string, any>[]) => void
  onFix: () => void
  confirming?: boolean
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString()

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function ReadbackBlock({ block, onConfirm, onFix, confirming }: Props) {
  const { records, entity } = block

  const columns = Array.from(new Set(
    records.flatMap((record) => Object.keys(record).filter((k) => k !== '_id'))
  ))

  const effectiveColumns = columns.length ? columns : ['record']
  const displayRows = records.map((row, index) => {
    if (columns.length) {
      return row
    }

    return { record: `Record ${index + 1}` }
  })

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Review these {records.length} {entity} - type a correction or confirm to save:
      </p>

      <div className="hidden md:block overflow-x-auto rounded-md border text-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {effectiveColumns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground capitalize">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                {effectiveColumns.map((col) => (
                  <td key={col} className="px-3 py-2">{formatCellValue(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2">
        {displayRows.map((row, i) => (
          <div key={i} className="rounded-md border p-3 space-y-1 border-l-2 border-l-primary">
            <p className="font-medium text-sm">{(row as any).name ?? (row as any).type ?? `Record ${i + 1}`}</p>
            <p className="text-xs text-muted-foreground">
              {effectiveColumns
                .filter((c) => c !== 'name')
                .map((c) => `${c}: ${formatCellValue((row as any)[c]) || '—'}`)
                .join(' · ')}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onConfirm(records as Record<string, any>[])}
          disabled={confirming || records.length === 0}
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