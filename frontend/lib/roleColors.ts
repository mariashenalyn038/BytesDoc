import type { Role } from '@/types'

export interface RoleColor {
  label: string
  ring: string
  bg: string
  dot: string
}

export const ROLE_COLORS: Record<Role, RoleColor> = {
  chief_minister: {
    label: 'Chief Minister',
    ring: 'ring-amber-300/60 dark:ring-amber-500/30',
    bg: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  secretary: {
    label: 'Secretary',
    ring: 'ring-blue-300/60 dark:ring-blue-500/30',
    bg: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  finance_minister: {
    label: 'Finance',
    ring: 'ring-emerald-300/60 dark:ring-emerald-500/30',
    bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  member: {
    label: 'Member',
    ring: 'ring-slate-300/60 dark:ring-slate-500/30',
    bg: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
    dot: 'bg-slate-500',
  },
}

export function roleColor(role: Role): RoleColor {
  return ROLE_COLORS[role] ?? ROLE_COLORS.member
}
