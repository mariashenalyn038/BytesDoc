'use client'

import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import Skeleton from '@/components/ui/Skeleton'
import FileTypeIcon from '@/components/ui/FileTypeIcon'
import { Document } from '@/types'

interface RecycleBinProps {
  documents: Document[]
  uploaderNames: Record<string, string>
  isLoading?: boolean
  canPermanentDelete: boolean
  onRestore: (doc: Document) => void
  onPermanentDelete: (doc: Document) => void
}

function daysUntilPurge(deletedAt: string | null | undefined): number {
  if (!deletedAt) return 30
  const diff = Date.now() - new Date(deletedAt).getTime()
  const daysElapsed = Math.floor(diff / (1000 * 60 * 60 * 24))
  return Math.max(0, 30 - daysElapsed)
}

export default function RecycleBin({
  documents,
  uploaderNames,
  isLoading = false,
  canPermanentDelete,
  onRestore,
  onPermanentDelete,
}: RecycleBinProps) {
  if (isLoading && documents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-5 w-5 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <EmptyState
          icon={Trash2}
          title="Recycle bin is empty"
          description="Deleted documents will appear here. They are permanently purged after 30 days."
        />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-700/40 px-4 py-3 mb-4">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-[12px] text-amber-800 dark:text-amber-300">
          Documents in the recycle bin are automatically purged after <strong>30 days</strong>.
          Archived documents cannot be trashed.
        </p>
      </div>

      {/* Mobile: card stack */}
      <div className="md:hidden space-y-3">
        {documents.map((doc) => {
          const days = daysUntilPurge(doc.deleted_at)
          return (
            <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
              <div className="flex items-start gap-2 min-w-0">
                <FileTypeIcon fileType={doc.fileType} size={18} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white break-words">{doc.title}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{doc.category} · {doc.administration}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Deleted by {uploaderNames[doc.uploadedBy] || 'Unknown'}</span>
                <span className={days <= 3 ? 'text-red-500 font-semibold' : ''}>
                  Purges in {days}d
                </span>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border-subtle dark:border-white/5">
                <button
                  onClick={() => onRestore(doc)}
                  title="Restore"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
                >
                  <RotateCcw size={13} /> Restore
                </button>
                {canPermanentDelete && (
                  <button
                    onClick={() => onPermanentDelete(doc)}
                    title="Delete permanently"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                  >
                    <Trash2 size={13} /> Delete permanently
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* md+: table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle dark:border-white/5 bg-gray-50/80 dark:bg-gray-900/40">
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Title</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Administration</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Deleted By</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Deleted On</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Purges In</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const days = daysUntilPurge(doc.deleted_at)
              return (
                <tr key={doc.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">
                    <span className="inline-flex items-center gap-2">
                      <FileTypeIcon fileType={doc.fileType} size={16} />
                      {doc.title}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{doc.category}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{doc.administration}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{uploaderNames[doc.uploadedBy] || 'Unknown'}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {doc.deleted_at ? new Date(doc.deleted_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold ${days <= 3 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                      {days}d
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onRestore(doc)}
                        title="Restore"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
                      >
                        <RotateCcw size={12} /> Restore
                      </button>
                      {canPermanentDelete && (
                        <button
                          onClick={() => onPermanentDelete(doc)}
                          title="Delete permanently"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                        >
                          <Trash2 size={12} /> Delete permanently
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
