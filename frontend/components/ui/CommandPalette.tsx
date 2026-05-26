'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Search,
  Moon,
  Sun,
  LogOut,
  Home,
  Folder,
  Archive,
  Settings,
  Users,
  Activity,
  Upload,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useDocumentStore } from '@/lib/stores/documentStore'
import { FileTypeTile } from '@/components/ui/FileTypeIcon'
import { Document } from '@/types'

interface Tab {
  name: string
  href: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tabs: Tab[]
  onNewUpload?: () => void
}

type Group = 'Pages' | 'Actions' | 'Recent documents'

type PaletteItem =
  | {
      id: string
      label: string
      group: Group
      kind: 'icon'
      icon: LucideIcon
      kbd?: string
      run: () => void
    }
  | {
      id: string
      label: string
      group: Group
      kind: 'file'
      fileType: Document['fileType']
      run: () => void
    }

const PAGE_ICONS: Record<string, LucideIcon> = {
  Dashboard: Home,
  Documents: Folder,
  Archive: Archive,
  'Document Settings': Settings,
  Users: Users,
  'Activity Logs': Activity,
}

export default function CommandPalette({ open, onOpenChange, tabs, onNewUpload }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const logout = useAuthStore(s => s.logout)
  const documents = useDocumentStore(s => s.documents)

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

  const recentDocs = useMemo(() => {
    return [...documents]
      .filter(d => !d.is_archived)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
      .slice(0, 3)
  }, [documents])

  const items = useMemo<PaletteItem[]>(() => {
    const pages: PaletteItem[] = tabs.map(t => ({
      id: `page-${t.name}`,
      label: `Go to ${t.name}`,
      group: 'Pages',
      kind: 'icon',
      icon: PAGE_ICONS[t.name] ?? Folder,
      run: () => router.push(t.href),
    }))
    const actions: PaletteItem[] = []
    if (onNewUpload) {
      actions.push({
        id: 'upload',
        label: 'Upload new document',
        group: 'Actions',
        kind: 'icon',
        icon: Upload,
        kbd: 'U',
        run: () => onNewUpload(),
      })
    }
    actions.push({
      id: 'toggle-theme',
      label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      group: 'Actions',
      kind: 'icon',
      icon: theme === 'dark' ? Sun : Moon,
      kbd: 'T',
      run: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    })
    actions.push({
      id: 'logout',
      label: 'Log out',
      group: 'Actions',
      kind: 'icon',
      icon: LogOut,
      run: async () => {
        await logout()
        router.push('/login')
      },
    })
    const recents: PaletteItem[] = recentDocs.map(d => ({
      id: `doc-${d.id}`,
      label: d.title,
      group: 'Recent documents',
      kind: 'file',
      fileType: d.fileType,
      run: () => router.push('/dashboard/admin?tab=documents'),
    }))
    return [...pages, ...actions, ...recents]
  }, [tabs, router, theme, setTheme, logout, onNewUpload, recentDocs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(i => i.label.toLowerCase().includes(q))
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
    return ['Pages', 'Actions', 'Recent documents']
      .filter(g => groups[g]?.length)
      .map(g => [g, groups[g]] as const)
  }, [filtered])

  const runItem = (item: PaletteItem) => {
    item.run()
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[selectedIndex]
      if (item) runItem(item)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-start pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="byd-backdrop-in absolute inset-0 bg-black/55 backdrop-blur-md"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div className="byd-modal-in relative w-full max-w-[620px] mx-auto rounded-xl bg-white dark:bg-[#161616] ring-1 ring-border-subtle dark:ring-white/10 shadow-elevated overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b border-border-subtle dark:border-white/5">
          <Search size={16} className="text-gray-400 mr-2.5" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or jump to…"
            className="flex-1 bg-transparent text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
          />
          <kbd className="inline-flex items-center text-[10px] font-medium text-gray-400 px-1.5 py-0.5 rounded ring-1 ring-gray-200 dark:ring-white/10">
            Esc
          </kbd>
        </div>

        <div className="max-h-[440px] overflow-y-auto scrollbar-none">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">No matches</p>
          ) : (
            sections.map(([group, rows]) => (
              <div key={group} className="pt-2 pb-1.5">
                <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  {group}
                </div>
                {rows.map(({ item, index }) => {
                  const isSelected = index === selectedIndex
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => runItem(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-white/[0.06]'
                          : 'hover:bg-gray-50 dark:hover:bg-white/[0.025]'
                      }`}
                    >
                      {item.kind === 'icon' ? (
                        <item.icon size={15} className="text-gray-500 dark:text-gray-400 shrink-0" />
                      ) : (
                        <FileTypeTile fileType={item.fileType} />
                      )}
                      <span className="text-[13px] text-gray-900 dark:text-white flex-1 truncate">
                        {item.label}
                      </span>
                      {item.kind === 'icon' && item.kbd && (
                        <span className="flex items-center gap-1">
                          {item.kbd.split(' ').map((k, j) => (
                            <kbd
                              key={j}
                              className="inline-flex items-center text-[10px] font-medium text-gray-400 px-1.5 py-0.5 rounded ring-1 ring-gray-200 dark:ring-white/10"
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                      )}
                      {isSelected && <ChevronRight size={14} className="text-gray-400" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border-subtle dark:border-white/5 px-4 py-2 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <kbd className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ring-1 ring-gray-200 dark:ring-white/10">↑</kbd>
            <kbd className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ring-1 ring-gray-200 dark:ring-white/10">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ring-1 ring-gray-200 dark:ring-white/10">↵</kbd>
            select
          </span>
        </div>
      </div>
    </div>
  )
}
