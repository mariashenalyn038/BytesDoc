'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { Plus, MoreHorizontal, Users as UsersIcon, AlertTriangle } from 'lucide-react'
import { User, Role } from '@/types'
import { ROLE_COLORS } from '@/lib/roleColors'
import Button from '@/components/ui/Button'
import DataTable, { Td } from '@/components/ui/DataTable'
import Avatar from '@/components/ui/Avatar'
import RolePill from '@/components/ui/RolePill'
import EmptyState from '@/components/ui/EmptyState'
import { useUserStore } from '@/lib/stores/userStore'
import { toast } from '@/lib/stores/toastStore'

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

// ── Dropdown menu ──────────────────────────────────────────────────────────
interface ActionMenuProps {
  user: User
  onRemove: (user: User) => void
}

function ActionMenu({ user, onRemove }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const isPending = user.status === 'pending'
  const label = isPending ? 'Remove invitation' : 'Remove member'

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(v => !v)}
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 z-50 mt-1 w-44 rounded-lg bg-white dark:bg-[#1a1a1a] ring-1 ring-border-subtle dark:ring-white/10 shadow-elevated py-1 text-[13px]"
        >
          <button
            role="menuitem"
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            onClick={() => {
              setOpen(false)
              onRemove(user)
            }}
          >
            <AlertTriangle size={13} className="shrink-0" />
            {label}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Confirmation modal ─────────────────────────────────────────────────────
interface ConfirmRemoveModalProps {
  user: User | null
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}

function ConfirmRemoveModal({ user, onConfirm, onCancel, isLoading }: ConfirmRemoveModalProps) {
  if (!user) return null

  const isPending = user.status === 'pending'
  const title = isPending ? 'Remove invitation?' : 'Remove member?'
  const description = isPending
    ? `The invitation sent to ${user.email} will be cancelled. They won't be able to join using the invite link.`
    : `${user.fullName} will lose access to BytesDoc immediately. This action cannot be undone.`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-remove-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#141414] ring-1 ring-border-subtle dark:ring-white/10 shadow-elevated p-6">
        {/* Icon */}
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
          <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
        </div>

        <h2
          id="confirm-remove-title"
          className="text-center text-base font-bold tracking-tight text-gray-900 dark:text-white"
        >
          {title}
        </h2>
        <p className="mt-2 text-center text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
          {description}
        </p>

        {/* User chip */}
        <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] ring-1 ring-border-subtle dark:ring-white/5 px-3 py-2.5">
          <Avatar name={user.fullName} role={user.role} size={28} />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-gray-900 dark:text-white">{user.fullName}</div>
            <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">{user.email}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg px-4 py-2 text-[13px] font-semibold text-gray-700 dark:text-gray-300 ring-1 ring-border-subtle dark:ring-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 rounded-lg px-4 py-2 text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-60"
          >
            {isLoading ? 'Removing…' : isPending ? 'Remove invitation' : 'Remove member'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function UsersTabContent({ users, onInvite }: UsersTabContentProps) {
  const { removeUser } = useUserStore()
  const [pendingRemove, setPendingRemove] = useState<User | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

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

  const handleConfirmRemove = async () => {
    if (!pendingRemove) return
    setIsRemoving(true)
    try {
      await removeUser(pendingRemove.id)
      const isPending = pendingRemove.status === 'pending'
      toast.success(isPending ? 'Invitation removed' : `${pendingRemove.fullName} has been removed`)
      setPendingRemove(null)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to remove user')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <>
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
                  {u.status === 'pending' ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2 py-0.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2 py-0.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  )}
                </Td>
                <Td>
                  <span className="text-[12px] text-gray-500 dark:text-gray-400 tabular-nums">
                    {formatJoined(u.createdAt)}
                  </span>
                </Td>
                <Td align="right">
                  <ActionMenu user={u} onRemove={setPendingRemove} />
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>

      {/* Confirmation modal */}
      <ConfirmRemoveModal
        user={pendingRemove}
        onConfirm={handleConfirmRemove}
        onCancel={() => !isRemoving && setPendingRemove(null)}
        isLoading={isRemoving}
      />
    </>
  )
}
