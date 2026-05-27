'use client'

import { useTheme } from 'next-themes'

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string; payload: { name: string } }>
  label?: string
  coordinate?: { x?: number; y?: number }
}

export default function ChartTooltip({ active, payload, label, coordinate }: ChartTooltipProps) {
  const { resolvedTheme } = useTheme()

  if (!active || !payload?.length) return null

  const value = payload[0].value
  const category = label ?? payload[0].payload?.name ?? 'Selected'

  const isDark = resolvedTheme === 'dark'
  const bg = isDark ? 'rgba(17,24,39,0.72)' : 'rgba(255,255,255,0.9)'
  const fg = isDark ? '#9d9fa1' : '#0f172a'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)'

  // Inline style allows precise positioning relative to Recharts' wrapper
  const style: React.CSSProperties = {
    background: bg,
    color: fg,
    border: `1px solid ${border}`,
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 13,
    boxShadow: '0 6px 20px rgba(2,6,23,0.35)',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  }

  // Position props are provided by Recharts' wrapper; inner style must be relative
  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: coordinate?.x ?? undefined,
    // use Recharts-provided coordinate Y (typically centered on the hovered bar); fallback to '50%'
    top: coordinate?.y ?? '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  }

  return (
    <div style={wrapperStyle}>
      <div style={style}>
        <div style={{ marginTop: 6, fontWeight: 600 }}>{category}</div>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
          <div style={{ fontWeight: 700, textAlign: 'center' }}>{value.toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}