import { Role } from '@/types'
import { roleColor } from '@/lib/roleColors'

interface RolePillProps {
  role: Role
  colored?: boolean
}

export default function RolePill({ role, colored = true }: RolePillProps) {
  const rc = roleColor(role)
  if (!colored) {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {rc.label}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest rounded-full px-2 py-0.5 ${rc.bg}`}>
      <span className={`size-1.5 rounded-full ${rc.dot}`} />
      {rc.label}
    </span>
  )
}
