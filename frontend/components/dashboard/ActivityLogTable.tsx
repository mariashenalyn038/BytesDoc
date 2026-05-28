'use client'

import { Activity } from 'lucide-react'
import { ActivityLog, User, Document } from '@/types'
import EmptyState from '@/components/ui/EmptyState'

interface ActivityLogTableProps {
  logs: ActivityLog[]
  users: User[]
  documents: Document[]
  filterUser: string
  filterAction: string
  onFilterUserChange: (userId: string) => void
  onFilterActionChange: (action: string) => void
}

export default function ActivityLogTable({
  logs,
  users,
  documents,
  filterUser,
  filterAction,
  onFilterUserChange,
  onFilterActionChange,
}: ActivityLogTableProps) {
  const filteredLogs = logs.filter(log => {
    const matchesUser = filterUser === 'All' || log.userId === filterUser
    const matchesAction = filterAction === 'All' || log.action === filterAction
    return matchesUser && matchesAction
  })

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
            Filter by User
          </label>
          <select
            value={filterUser}
            onChange={(e) => onFilterUserChange(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="All">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
            Filter by Action
          </label>
          <select
            value={filterAction}
            onChange={(e) => onFilterActionChange(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="All">All Actions</option>
            <option value="upload">Upload</option>
            <option value="download">Download</option>
            <option value="view">View</option>
            <option value="archive">Archive</option>
            <option value="delete">Delete</option>
            <option value="restore">Restore</option>
            <option value="login">Login</option>
          </select>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description={
              filterUser !== 'All' || filterAction !== 'All'
                ? 'No logs match the current filters. Try clearing them.'
                : 'Logins, uploads, downloads, archives, deletes, and restores will show up here.'
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile: card stack */}
          <div className="md:hidden space-y-2.5">
            {filteredLogs.map((log) => {
              const logUser = users.find(u => u.id === log.userId)
              const doc = log.documentId ? documents.find(d => d.id === log.documentId) : null
              return (
                <div key={log.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-3.5">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {logUser?.fullName ?? 'Unknown'}
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-200 shrink-0">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 break-words">
                    {doc?.title ?? 'N/A'}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1.5">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>

          {/* md+: table */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle dark:border-white/5 bg-gray-50/80 dark:bg-gray-900/40">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">User</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Action</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Document</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const logUser = users.find(u => u.id === log.userId)
                  const doc = log.documentId ? documents.find(d => d.id === log.documentId) : null
                  return (
                    <tr key={log.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{logUser?.fullName}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{log.action}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{doc?.title || 'N/A'}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
