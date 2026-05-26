'use client'

import { ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
  Search,
  Plus,
  Home,
  Folder,
  Archive,
  Settings,
  Users as UsersIcon,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import CommandPalette from '@/components/ui/CommandPalette'
import ProfileModal from '@/components/ui/ProfileModal'
import Avatar from '@/components/ui/Avatar'

interface Tab {
  name: string
  href: string
}

interface DashboardLayoutProps {
  children: ReactNode
  tabs: Tab[]
  activeTab: string
  onNewUpload?: () => void
}

const TAB_ICONS: Record<string, LucideIcon> = {
  Dashboard: Home,
  Documents: Folder,
  Archive: Archive,
  'Document Settings': Settings,
  Users: UsersIcon,
  'Activity Logs': Activity,
}

export default function DashboardLayout({ children, tabs, activeTab, onNewUpload }: DashboardLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { user, logout, updateProfile } = useAuthStore()
  const router = useRouter()
  const { theme, resolvedTheme, setTheme } = useTheme()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const closeDrawer = () => setDrawerOpen(false)
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark text-gray-900 dark:text-white antialiased lg:flex">
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-auto
          h-screen w-[260px] lg:w-[220px] lg:shrink-0
          text-white flex flex-col
          transition-transform duration-300 ease-out
          ${drawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: '#1a1a1a' }}
      >
        <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2.5 min-w-0">
            <Image
              src="/byteslogo1.png"
              alt="BYTES Logo"
              width={28}
              height={28}
              className="rounded-sm shrink-0"
            />
            <span className="font-bold tracking-tighter uppercase text-base text-white truncate">
              BytesDoc
            </span>
          </div>
          <button
            onClick={closeDrawer}
            className="lg:hidden p-1.5 rounded-md hover:bg-white/10 text-gray-300"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-3 pt-1 pb-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40 px-2">
            Workspace
          </div>
        </div>

        <nav className="px-2 flex flex-col gap-0.5 flex-1 overflow-y-auto">
          {tabs.map(tab => {
            const Icon = TAB_ICONS[tab.name] ?? Folder
            const isActive = activeTab === tab.name
            return (
              <Link
                key={tab.name}
                href={tab.href}
                onClick={closeDrawer}
                className={`relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                  isActive
                    ? 'text-white font-semibold bg-white/[0.06]'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.04] font-medium'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-white" />
                )}
                <Icon size={16} className={isActive ? '' : 'opacity-80'} />
                <span>{tab.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3">
          {user && (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              title="Edit your name"
              className="w-full text-left rounded-lg ring-1 ring-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2.5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Avatar name={user.fullName} role={user.role} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-white truncate">{user.fullName}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mt-0.5">
                    {user.role?.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600 text-red-300 hover:text-white px-3 py-2 rounded-lg transition-colors ring-1 ring-red-600/20"
          >
            <LogOut size={14} />
            <span className="text-[11px] font-bold uppercase tracking-wider">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main column ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-14 shrink-0 border-b border-border-subtle dark:border-white/5 bg-white dark:bg-[#111] flex items-center px-4 sm:px-5 gap-2 sm:gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-1.5 -ml-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-gray-300"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            className="flex-1 max-w-md inline-flex items-center gap-2 text-left rounded-lg ring-1 ring-border-subtle dark:ring-white/10 bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.05] px-3 py-1.5 transition-colors"
            aria-label="Open command palette"
          >
            <Search size={14} className="text-gray-400" />
            <span className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
              Search documents, users, actions…
            </span>
            <span className="ml-auto hidden sm:inline-flex items-center gap-1">
              <kbd className="inline-flex items-center text-[10px] font-medium text-gray-400 px-1.5 py-0.5 rounded ring-1 ring-gray-200 dark:ring-white/10">⌘</kbd>
              <kbd className="inline-flex items-center text-[10px] font-medium text-gray-400 px-1.5 py-0.5 rounded ring-1 ring-gray-200 dark:ring-white/10">K</kbd>
            </span>
          </button>

          <div className="flex-1 hidden sm:block" />

          {onNewUpload && (
            <button
              onClick={onNewUpload}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-primary hover:bg-accent rounded-lg px-3 py-1.5 transition-colors"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">New upload</span>
            </button>
          )}

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="size-9 grid place-items-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} tabs={tabs} onNewUpload={onNewUpload} />

      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentName={user?.fullName ?? ''}
        onSave={updateProfile}
      />
    </div>
  )
}
