'use client'

import { useMemo } from 'react'
import { Plus, MoreHorizontal, Users as UsersIcon } from 'lucide-react'
import { User, Role } from '@/types'
import { ROLE_COLORS } from '@/lib/roleColors'
import Button from '@/components/ui/Button'
import DataTable, { Td } from '@/components/ui/DataTable'
import Avatar from '@/components/ui/Avatar'
import RolePill from '@/components/ui/RolePill'
import EmptyState from '@/components/ui/EmptyState'

interface UsersTabContentProps {
  users: User[]
  onInvite: () => void
}

const ROLE_ORDER: Role[] = ['chief_minister', 'secretary', 'finance_minister', 'member']

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export default function UsersTabContent({ users, onInvite }: UsersTabContentProps) {
  const counts = useMemo(() => {
    const m: Record<Role, number> = {
      chief_minister: 0,
      secretary: 0,
      finance_minister: 0,
      member: 0,
    }
    for (const u of users) m[u.role] = (m[u.role] ?? 0) + 1
    return m
  }, [users])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Membership
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
            Users &amp; Roles
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
            Manage who can access the council archive and what they can do.
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={onInvite}>
          Invite member
        </Button>
      </div>

      {/* Role distribution strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {ROLE_ORDER.map(role => {
          const rc = ROLE_COLORS[role]
          return (
            <div
              key={role}
              className="rounded-xl bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft px-3 py-2.5 flex items-center gap-3"
            >
              <div className={`size-9 rounded-lg grid place-items-center ${rc.bg}`}>
                <UsersIcon size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  {rc.label}
                </div>
                <div className="text-lg font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">
                  {counts[role]}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Users table */}
      {users.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft">
          <EmptyState
            icon={UsersIcon}
            title="No users yet"
            description="Invited council members will appear here once they accept."
            action={<Button variant="primary" size="sm" icon={Plus} onClick={onInvite}>Invite member</Button>}
          />
        </div>
      ) : (
        <DataTable
          columns={[
            { label: 'Member' },
            { label: 'Role', width: '180px' },
            { label: 'Status', width: '120px' },
            { label: 'Joined', width: '140px' },
            { label: '', width: '40px', align: 'right' },
          ]}
        >
          {users.map(u => (
            <tr key={u.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.025] transition-colors">
              <Td>
                <div className="flex items-center gap-3">
                  <Avatar name={u.fullName} role={u.role} size={32} />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white">{u.fullName}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">{u.email}</div>
                  </div>
                </div>
              </Td>
              <Td>
                <RolePill role={u.role} />
              </Td>
              <Td>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2 py-0.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </Td>
              <Td>
                <span className="text-[12px] text-gray-500 dark:text-gray-400 tabular-nums">
                  {formatJoined(u.createdAt)}
                </span>
              </Td>
              <Td align="right">
                <button
                  type="button"
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  aria-label="More actions"
                >
                  <MoreHorizontal size={14} />
                </button>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  )
}
