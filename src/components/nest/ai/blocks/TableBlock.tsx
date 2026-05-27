"use client"

import Link from 'next/link'
import { TableBlock as TableBlockType } from '@/lib/ai-types'

const DESKTOP_LIMIT = 5
const MOBILE_LIMIT = 2

export function TableBlock({ block }: { block: TableBlockType }) {
  const { data, totalCount, filterUrl, entity } = block
  if (!data.length) return <p className="text-sm text-muted-foreground">No results found.</p>

  const columns = Object.keys(data[0]).filter((k) => k !== '_id')
  const showViewAll = totalCount > DESKTOP_LIMIT

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border text-xs">
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
            {data.slice(0, DESKTOP_LIMIT).map((row, i) => (
              <tr
                key={i}
                className={`border-b last:border-0 ${i >= MOBILE_LIMIT ? 'hidden md:table-row' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-muted-foreground">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showViewAll && (
        <Link
          href={filterUrl}
          className="text-xs text-primary underline-offset-2 hover:underline"
        >
          View all {totalCount} results in {entity} table →
        </Link>
      )}
    </div>
  )
}