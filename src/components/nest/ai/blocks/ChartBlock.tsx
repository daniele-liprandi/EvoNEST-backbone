"use client"

import dynamic from 'next/dynamic'
import {
  BarChart, Bar, ScatterChart, Scatter, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ChartBlock as ChartBlockType } from '@/lib/ai-types'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export function ChartBlock({ block }: { block: ChartBlockType }) {
  const { chartType, title, data, config } = block

  if (chartType === 'treemap') {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <Plot
          data={[{
            type: 'treemap',
            ids: (data as any[]).map((d: any) => d.id),
            labels: (data as any[]).map((d: any) => d.label),
            parents: (data as any[]).map((d: any) => d.parent),
            values: (data as any[]).map((d: any) => d.value),
            ...config,
          }]}
          layout={{ margin: { t: 0, b: 0, l: 0, r: 0 }, height: 300 }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: '100%' }}
        />
      </div>
    )
  }

  const xKey = (config as any).xKey ?? Object.keys((data as any[])[0] ?? {})[0]
  const yKey = (config as any).yKey ?? Object.keys((data as any[])[0] ?? {})[1]

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ResponsiveContainer width="100%" height={240}>
        {chartType === 'bar' ? (
          <BarChart data={data as any[]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey={yKey} fill="hsl(var(--primary))" />
          </BarChart>
        ) : chartType === 'scatter' ? (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
            <YAxis dataKey={yKey} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Scatter data={data as any[]} fill="hsl(var(--primary))" />
          </ScatterChart>
        ) : (
          <LineChart data={data as any[]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke="hsl(var(--primary))" dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}