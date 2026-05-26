'use client'

import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  footer?: ReactNode
  width?: number | string
  children: ReactNode
  contentClassName?: string
}

export default function Modal({
  isOpen,
  onClose,
  title,
  eyebrow,
  footer,
  width = 560,
  children,
  contentClassName = '',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const widthStyle = typeof width === 'number' ? { width } : { width }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="byd-backdrop-in absolute inset-0 bg-black/55 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="byd-modal-in relative max-w-full max-h-[90vh] overflow-hidden flex flex-col rounded-xl bg-white dark:bg-[#161616] ring-1 ring-border-subtle dark:ring-white/10 shadow-elevated"
        style={widthStyle}
      >
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border-subtle dark:border-white/5">
          <div>
            {eyebrow && (
              <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-0.5">
                {eyebrow}
              </div>
            )}
            <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className={`px-5 py-4 overflow-y-auto ${contentClassName}`}>{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-border-subtle dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
