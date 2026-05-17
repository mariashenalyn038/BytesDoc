'use client'

import { BsFiletypePdf, BsFiletypeDocx } from 'react-icons/bs'
import { FileText } from 'lucide-react'
import { Document } from '@/types'

// Icon components from lucide and react-icons have slightly different prop
// shapes, so this is intentionally loose — we only render with size/className/style.
interface IconConfig {
  Icon: React.ComponentType<any>
  color: string
  label: string
  short: string
  badgeClass: string
}

const MAP: Record<Document['fileType'], IconConfig> = {
  pdf: {
    Icon: BsFiletypePdf,
    color: '#dc2626',
    label: 'PDF document',
    short: 'PDF',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 ring-red-200/60 dark:ring-red-900/40',
  },
  docx: {
    Icon: BsFiletypeDocx,
    color: '#2563eb',
    label: 'Word document',
    short: 'DOCX',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 ring-blue-200/60 dark:ring-blue-900/40',
  },
}

const FALLBACK: IconConfig = {
  Icon: FileText,
  color: '#6b7280',
  label: 'Document',
  short: 'FILE',
  badgeClass: 'bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-gray-300 ring-gray-200/60 dark:ring-white/10',
}

export function fileTypeMeta(t: Document['fileType']): IconConfig {
  return MAP[t] ?? FALLBACK
}

export function FileTypeBadge({ fileType }: { fileType: Document['fileType'] }) {
  const cfg = fileTypeMeta(fileType)
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ring-1 ${cfg.badgeClass}`}
      title={cfg.label}
    >
      {cfg.short}
    </span>
  )
}

export default function FileTypeIcon({
  fileType,
  size = 18,
  className,
  color,
}: {
  fileType: Document['fileType']
  size?: number
  className?: string
  color?: string
}) {
  const cfg = fileTypeMeta(fileType)
  return <cfg.Icon size={size} className={className} style={{ color: color ?? cfg.color }} />
}
