'use client'

import { useTheme } from 'next-themes'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import ChartToolTip from './ChartToolTip'

interface LineChartProps {
  data: { name: string; value: number }[]
}

export default function LineChart({ data }: LineChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const axis = isDark ? '#9ca3af' : '#6b7280'
  const grid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const stroke = isDark ? '#aab1bc' : '#393939'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis dataKey="name" stroke={axis} fontSize={12} tickLine={false} axisLine={{ stroke: grid }} />
        <YAxis stroke={axis} fontSize={12} tickLine={false} axisLine={{ stroke: grid }} />
        <Tooltip
          cursor={{ stroke: grid, strokeWidth: 1 }}
          content={<ChartToolTip />}
          wrapperStyle={{ pointerEvents: 'none' }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          dot={{ r: 3, fill: stroke, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: stroke, strokeWidth: 2, stroke: isDark ? '#0d0d0d' : '#ffffff' }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
