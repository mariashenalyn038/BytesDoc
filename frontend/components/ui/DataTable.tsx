import { ReactNode, TdHTMLAttributes } from 'react'

export interface DataTableColumn {
  label: ReactNode
  width?: string
  align?: 'left' | 'right'
}

interface DataTableProps {
  columns: DataTableColumn[]
  children: ReactNode
  footer?: ReactNode
  dense?: boolean
  className?: string
}

export default function DataTable({ columns, children, footer, dense = false, className = '' }: DataTableProps) {
  return (
    <div className={`rounded-xl bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/80 dark:bg-white/[0.02]">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  style={c.width ? { width: c.width } : undefined}
                  className={`text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-4 ${dense ? 'py-2' : 'py-2.5'} ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle dark:divide-white/5">
            {children}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="px-4 py-2.5 border-t border-border-subtle dark:border-white/5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/40 dark:bg-white/[0.01]">
          {footer}
        </div>
      )}
    </div>
  )
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'right'
}

export function Td({ className = '', align, children, ...rest }: TdProps) {
  return (
    <td
      className={`px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 ${align === 'right' ? 'text-right' : ''} ${className}`}
      {...rest}
    >
      {children}
    </td>
  )
}
