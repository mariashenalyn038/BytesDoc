import { Role } from '@/types'
import { roleColor } from '@/lib/roleColors'

interface AvatarProps {
  name: string
  role?: Role
  size?: number
  className?: string
}

function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(s => s[0] ?? '')
    .join('')
    .toUpperCase() || '?'
}

export default function Avatar({ name, role = 'member', size = 32, className = '' }: AvatarProps) {
  const rc = roleColor(role)
  const initials = initialsFromName(name)
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full ring-2 font-semibold shrink-0 ${rc.ring} ${rc.bg} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      title={name}
      aria-label={name}
    >
      {initials}
    </div>
  )
}
