'use client'

import { useMemo } from 'react'
import { Download, Users as UsersIcon, Calendar, ChevronDown, Activity as ActivityIcon } from 'lucide-react'
import { ActivityLog, User, Document, Role } from '@/types'
import { ROLE_COLORS } from '@/lib/roleColors'
import Button from '@/components/ui/Button'
import DataTable, { Td } from '@/components/ui/DataTable'
import Avatar from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'

interface LogsTabContentProps {
  logs: ActivityLog[]
  users: User[]
  documents: Document[]
  filterUser: string
  filterAction: string
  onFilterUserChange: (userId: string) => void
  onFilterActionChange: (action: string) => void
  onExport: () => void
}

const FILTER_PILLS: { label: string; value: string }[] = [
  { label: 'All', value: 'All' },
  { label: 'Upload', value: 'upload' },
  { label: 'View', value: 'view' },
  { label: 'Download', value: 'download' },
  { label: 'Archive', value: 'archive' },
  { label: 'Login', value: 'login' },
]

const ACTION_TONE: Record<string, { label: string; cls: string }> = {
  upload:   { label: 'Upload',   cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' },
  download: { label: 'Download', cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' },
  view:     { label: 'View',     cls: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-500/10' },
  archive:  { label: 'Archive',  cls: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' },
  lock:     { label: 'Lock',     cls: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' },
  unlock:   { label: 'Unlock',   cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' },
  login:    { label: 'Login',    cls: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-500/10' },
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

export default function LogsTabContent({
  logs,
  users,
  documents,
  filterUser,
  filterAction,
  onFilterUserChange,
  onFilterActionChange,
  onExport,
}: LogsTabContentProps) {
  const usersById = useMemo(() => {
    const m = new Map<string, User>()
    for (const u of users) m.set(u.id, u)
    return m
  }, [users])

  const docsById = useMemo(() => {
    const m = new Map<string, Document>()
    for (const d of documents) m.set(d.id, d)
    return m
  }, [documents])

  const filteredLogs = useMemo(
    () => logs.filter(l => {
      const matchUser = filterUser === 'All' || l.userId === filterUser
      const matchAction = filterAction === 'All' || l.action === filterAction
      return matchUser && matchAction
    }),
    [logs, filterUser, filterAction]
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Audit trail
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
            Activity Logs
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
            Every upload, view, download, archive, and login in the council archive.
          </p>
        </div>
        <Button variant="outline" size="sm" icon={Download} onClick={onExport}>
          Export CSV
        </Button>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_PILLS.map(pill => {
          const on = filterAction === pill.value
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => onFilterActionChange(pill.value)}
              className={`text-[12px] font-medium rounded-full px-3 py-1 transition-colors ${
                on
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08]'
              }`}
            >
              {pill.label}
            </button>
          )
        })}
        <div className="h-5 w-px bg-border-subtle dark:bg-white/10 mx-1" />
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3 py-1 ring-1 ring-border-subtle dark:ring-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
        >
          <Calendar size={12} /> Last 30 days
          <ChevronDown size={11} />
        </button>
        <div className="relative">
          <select
            value={filterUser}
            onChange={e => onFilterUserChange(e.target.value)}
            className="appearance-none inline-flex items-center gap-1.5 text-[12px] font-medium rounded-full pl-7 pr-7 py-1 ring-1 ring-border-subtle dark:ring-white/10 text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.04] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <option value="All">All users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
          <UsersIcon size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft">
          <EmptyState
            icon={ActivityIcon}
            title="No activity yet"
            description={
              filterUser !== 'All' || filterAction !== 'All'
                ? 'No logs match the current filters. Try clearing them.'
                : 'Logins, uploads, downloads, and archives will show up here.'
            }
          />
        </div>
      ) : (
        <DataTable
          columns={[
            { label: 'When', width: '170px' },
            { label: 'Actor', width: '240px' },
            { label: 'Action', width: '120px' },
            { label: 'Target' },
          ]}
          footer={`Showing ${filteredLogs.length} of ${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}`}
        >
          {filteredLogs.map(log => {
            const actor = usersById.get(log.userId)
            const doc = log.documentId ? docsById.get(log.documentId) : null
            const tone = ACTION_TONE[log.action] ?? { label: log.action, cls: 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06]' }
            const actorRole = (actor?.role ?? 'member') as Role
            return (
              <tr key={log.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.025] transition-colors">
                <Td>
                  <span className="font-mono text-[12px] text-gray-500 dark:text-gray-400">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Avatar name={actor?.fullName ?? 'Unknown'} role={actorRole} size={22} />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {actor?.fullName ?? 'Unknown'}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-gray-400">
                        {ROLE_COLORS[actorRole].label}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <span className={`inline-flex items-center text-[11px] font-semibold rounded-full px-2 py-0.5 ${tone.cls}`}>
                    {tone.label}
                  </span>
                </Td>
                <Td>
                  {doc ? (
                    <span className="text-gray-700 dark:text-gray-300">{doc.title}</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  )}
                </Td>
              </tr>
            )
          })}
        </DataTable>
      )}
    </div>
  )
}
