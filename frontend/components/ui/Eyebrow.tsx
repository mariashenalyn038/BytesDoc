import { ReactNode } from 'react'

interface EyebrowProps {
  children: ReactNode
  className?: string
}

export default function Eyebrow({ children, className = '' }: EyebrowProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] px-2 py-1 rounded-full ${className}`}>
      {children}
    </span>
  )
}
