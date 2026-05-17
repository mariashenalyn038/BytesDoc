'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Search,
  ArrowRight,
  Moon,
  Sun,
  LogOut,
  FileText,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'

interface Tab {
  name: string
  href: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tabs: Tab[]
}

type PaletteItem = {
  id: string
  label: string
  group: 'Pages' | 'Actions'
  icon: LucideIcon
  run: () => void
}

export default function CommandPalette({ open, onOpenChange, tabs }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      } else if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onOpenChange])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  const items: PaletteItem[] = useMemo(() => {
    const pageItems: PaletteItem[] = tabs.map((t) => ({
      id: `page-${t.name}`,
      label: t.name,
      group: 'Pages',
      icon: FileText,
      run: () => router.push(t.href),
    }))
    const actionItems: PaletteItem[] = [
      {
        id: 'toggle-theme',
        label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        group: 'Actions',
        icon: theme === 'dark' ? Sun : Moon,
        run: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'logout',
        label: 'Log out',
        group: 'Actions',
        icon: LogOut,
        run: async () => {
          await logout()
          router.push('/login')
        },
      },
    ]
    return [...pageItems, ...actionItems]
  }, [tabs, router, theme, setTheme, logout])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.label.toLowerCase().includes(q))
  }, [items, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const sections = useMemo(() => {
    const groups: Record<string, { item: PaletteItem; index: number }[]> = {}
    filtered.forEach((item, idx) => {
      if (!groups[item.group]) groups[item.group] = []
      groups[item.group].push({ item, index: idx })
    })
    return Object.entries(groups)
  }, [filtered])

  const runItem = (item: PaletteItem) => {
    item.run()
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[selectedIndex]
      if (item) runItem(item)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh] px-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-elevated ring-1 ring-black/10 dark:ring-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle dark:border-white/5">
          <Search size={18} className="text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages and actions..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center text-[10px] font-medium text-gray-400 px-1.5 py-0.5 rounded ring-1 ring-gray-200 dark:ring-white/10">
            ESC
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">No matches</p>
          ) : (
            sections.map(([group, rows]) => (
              <div key={group} className="mb-1">
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {group}
                </p>
                {rows.map(({ item, index }) => {
                  const isSelected = index === selectedIndex
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => runItem(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon size={16} className="text-gray-400 dark:text-gray-500" />
                      <span className="flex-1">{item.label}</span>
                      {isSelected && <ArrowRight size={14} className="text-gray-400" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border-subtle dark:border-white/5 text-[10px] text-gray-400">
          <span>
            <kbd className="font-medium">↑↓</kbd> Navigate
          </span>
          <span>
            <kbd className="font-medium">↵</kbd> Open
          </span>
        </div>
      </div>
    </div>
  )
}
