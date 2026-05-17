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
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
            Filter by User
          </label>
          <select
            value={filterUser}
            onChange={(e) => onFilterUserChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="All">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
            Filter by Action
          </label>
          <select
            value={filterAction}
            onChange={(e) => onFilterActionChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="All">All Actions</option>
            <option value="upload">Upload</option>
            <option value="download">Download</option>
            <option value="view">View</option>
            <option value="archive">Archive</option>
            <option value="login">Login</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description={
              filterUser !== 'All' || filterAction !== 'All'
                ? 'No logs match the current filters. Try clearing them.'
                : 'Logins, uploads, downloads, and archives will show up here.'
            }
          />
        ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-3 px-4 text-gray-900 dark:text-white">User</th>
              <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Action</th>
              <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Document</th>
              <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Timestamp</th>
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
        )}
      </div>
    </>
  )
}
