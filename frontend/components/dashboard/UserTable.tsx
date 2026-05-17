'use client'

import { Users } from 'lucide-react'
import { User } from '@/types'
import EmptyState from '@/components/ui/EmptyState'

interface UserTableProps {
  users: User[]
  onRoleChange: (userId: string, newRole: User['role']) => void
}

export default function UserTable({ users, onRoleChange }: UserTableProps) {
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b dark:border-gray-700">
            <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Email</th>
            <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Full Name</th>
            <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Role</th>
            <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Created At</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <td className="py-3 px-4 text-gray-900 dark:text-white">{u.email}</td>
              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{u.fullName}</td>
              <td className="py-3 px-4">
                <select
                  value={u.role}
                  onChange={(e) => onRoleChange(u.id, e.target.value as User['role'])}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                >
                  <option value="chief_minister">Chief Minister</option>
                  <option value="secretary">Secretary</option>
                  <option value="finance_minister">Finance Minister</option>
                  <option value="member">Member</option>
                </select>
              </td>
              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
