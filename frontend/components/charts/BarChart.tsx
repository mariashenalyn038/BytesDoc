'use client'

import { useTheme } from 'next-themes'
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import ChartTooltip from './ChartTooltip'

interface BarChartProps {
  data: { name: string; value: number }[]
}

export default function BarChart({ data }: BarChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const axis = isDark ? '#bcc4d2' : '#6b7280'
  const grid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const fill = isDark ? '#aab1bc' : '#393939'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey="name" stroke={axis} fontSize={12} tickLine={false} axisLine={{ stroke: grid }} />
        <YAxis stroke={axis} fontSize={12} tickLine={false} axisLine={{ stroke: grid }} />
        <Tooltip
          cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
          content={<ChartTooltip />}
          wrapperStyle={{ pointerEvents: 'none' }}
        />
        <Bar dataKey="value" fill={fill} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
