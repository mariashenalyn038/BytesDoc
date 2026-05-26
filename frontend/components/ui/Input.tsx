'use client'

import { InputHTMLAttributes, ReactNode, forwardRef } from 'react'
import { LucideIcon } from 'lucide-react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: LucideIcon
  label?: string
  hint?: string
  suffix?: ReactNode
  wrapperClassName?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon: Icon, label, hint, suffix, wrapperClassName = '', className = '', id, ...rest },
  ref
) {
  const inputId = id ?? rest.name
  return (
    <label className={`block ${wrapperClassName}`} htmlFor={inputId}>
      {label && (
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
          {label}
        </span>
      )}
      <div className="group relative flex items-center rounded-lg ring-1 ring-border-subtle dark:ring-white/10 bg-white dark:bg-white/[0.02] focus-within:ring-2 focus-within:ring-primary/40 dark:focus-within:ring-white/40 transition-shadow">
        {Icon && (
          <span className="pl-3 text-gray-400 group-focus-within:text-gray-600 dark:group-focus-within:text-gray-200">
            <Icon size={15} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`flex-1 bg-transparent text-[13px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 outline-none ${className}`}
          {...rest}
        />
        {suffix}
      </div>
      {hint && (
        <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-1">{hint}</span>
      )}
    </label>
  )
})

export default Input
