import { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2, LucideIcon } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  isLoading?: boolean
  className?: string
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:   'bg-primary text-white hover:bg-accent',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]',
  danger:    'bg-red-500 text-white hover:bg-red-600',
  ghost:     'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]',
  outline:   'ring-1 ring-border-subtle dark:ring-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.04]',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'text-[12px] px-2.5 py-1',
  md: 'text-[13px] px-3 py-1.5',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  isLoading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:focus-visible:ring-white/40 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100'
  const isDisabled = disabled || isLoading
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`${base} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : Icon && <Icon size={14} />}
      {children}
    </button>
  )
}
