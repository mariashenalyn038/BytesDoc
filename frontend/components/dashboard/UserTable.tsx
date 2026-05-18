'use client'

import { useState } from 'react'
import { Users, Pencil } from 'lucide-react'
import { User } from '@/types'
import EmptyState from '@/components/ui/EmptyState'
import ProfileModal from '@/components/ui/ProfileModal'
import { useUserStore } from '@/lib/stores/userStore'

interface UserTableProps {
  users: User[]
  onRoleChange: (userId: string, newRole: User['role']) => void
}

export default function UserTable({ users, onRoleChange }: UserTableProps) {
  const updateUserName = useUserStore((s) => s.updateUserName)
  const [renameTarget, setRenameTarget] = useState<User | null>(null)

  if (users.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Invited council members will appear here once they accept."
        />
      </div>
    )
  }

  const roleSelect = (u: User, extraClass = '') => (
    <select
      value={u.role}
      onChange={(e) => onRoleChange(u.id, e.target.value as User['role'])}
      className={`px-3 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white ${extraClass}`}
    >
      <option value="chief_minister">Chief Minister</option>
      <option value="secretary">Secretary</option>
      <option value="finance_minister">Finance Minister</option>
      <option value="member">Member</option>
    </select>
  )

  return (
    <>
      {/* Mobile: card stack */}
      <div className="md:hidden space-y-3">
        {users.map((u) => (
          <div key={u.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
            <div>
              <button
                type="button"
                onClick={() => setRenameTarget(u)}
                title="Rename user"
                className="group inline-flex items-center gap-2 font-semibold text-sm text-gray-900 dark:text-white hover:text-primary dark:hover:text-white transition-colors"
              >
                <span className="break-words text-left">{u.fullName}</span>
                <Pencil size={12} className="text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors shrink-0" />
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 break-all mt-0.5">{u.email}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              {roleSelect(u, 'text-sm flex-1 min-w-0')}
              <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                {new Date(u.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* md+: table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle dark:border-white/5 bg-gray-50/80 dark:bg-gray-900/40">
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Full Name</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Role</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="py-3 px-4 text-gray-900 dark:text-white">{u.email}</td>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                  <button
                    type="button"
                    onClick={() => setRenameTarget(u)}
                    title="Rename user"
                    className="group inline-flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <span>{u.fullName}</span>
                    <Pencil size={12} className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity" />
                  </button>
                </td>
                <td className="py-3 px-4">{roleSelect(u)}</td>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProfileModal
        isOpen={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        currentName={renameTarget?.fullName ?? ''}
        onSave={async (name) => {
          if (renameTarget) await updateUserName(renameTarget.id, name)
        }}
        title={renameTarget ? `Rename ${renameTarget.email}` : 'Rename user'}
        successMessage="User renamed"
      />
    </>
  )
}
