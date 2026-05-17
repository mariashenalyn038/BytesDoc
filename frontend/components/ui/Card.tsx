import { ReactNode } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface CardProps {
  title: string
  value: string | number
  icon?: ReactNode
  delta?: number
  deltaLabel?: string
  sparkline?: number[]
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 80
  const h = 24
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = w / (values.length - 1)
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-gray-700 dark:text-gray-300">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

export default function Card({ title, value, icon, delta, deltaLabel, sparkline }: CardProps) {
  const hasDelta = typeof delta === 'number'
  const isPositive = hasDelta && delta! >= 0
  const deltaColor = isPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400'
  const DeltaIcon = isPositive ? ArrowUpRight : ArrowDownRight

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-soft border border-border-subtle dark:border-white/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2 tabular-nums">{value}</p>
          {hasDelta && (
            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
              <DeltaIcon size={14} />
              <span>{isPositive ? '+' : ''}{delta}</span>
              {deltaLabel && <span className="text-gray-500 dark:text-gray-500 font-normal ml-1">{deltaLabel}</span>}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          {icon && <div className="text-gray-700 dark:text-gray-300">{icon}</div>}
          {sparkline && sparkline.length > 1 && <Sparkline values={sparkline} />}
        </div>
      </div>
    </div>
  )
}
