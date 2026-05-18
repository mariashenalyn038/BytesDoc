'use client'

import { Document } from '@/types'
import { Download, Eye, Edit, Trash2, Archive, FileText, Lock } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import FileTypeIcon from '@/components/ui/FileTypeIcon'
import Skeleton from '@/components/ui/Skeleton'

interface DocumentTableProps {
  documents: Document[]
  canUpload: boolean
  canEdit: (doc: Document) => boolean
  canDelete: (doc: Document) => boolean
  canArchive: boolean
  onView: (doc: Document) => void
  onDownload: (doc: Document) => void
  onEdit?: (doc: Document) => void
  onDelete?: (doc: Document) => void
  onArchive?: (doc: Document) => void
  uploaderNames?: Record<string, string>
  isLoading?: boolean
}

export default function DocumentTable({
  documents,
  canEdit,
  canDelete,
  canArchive,
  onView,
  onDownload,
  onEdit,
  onDelete,
  onArchive,
  uploaderNames = {},
  isLoading = false,
}: DocumentTableProps) {
  if (isLoading && documents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-5 w-5 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
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
          icon={FileText}
          title="No documents yet"
          description="When documents are uploaded, they'll show up here."
        />
      </div>
    )
  }

  return (
    <>
      {/* Mobile: card stack */}
      <div className="md:hidden space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3"
          >
            <div className="flex items-start gap-2 min-w-0">
              <FileTypeIcon fileType={doc.fileType} size={18} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white break-words">
                  {doc.title}
                </p>
                {doc.is_locked && !doc.is_archived && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                    <Lock size={11} />
                    Locked
                  </span>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <MetaLine label="Category" value={doc.category} />
              <MetaLine label="Event" value={doc.event} />
              <MetaLine label="Admin" value={doc.administration} />
              <MetaLine label="Uploader" value={uploaderNames[doc.uploadedBy] || 'Unknown'} />
              <MetaLine label="Date" value={new Date(doc.uploadDate).toLocaleDateString()} />
            </dl>
            <div className="flex gap-3 pt-2 border-t border-border-subtle dark:border-white/5">
              <ActionButton onClick={() => onView(doc)} title="View" colorClass="text-green-600 dark:text-green-400">
                <Eye size={18} />
              </ActionButton>
              <ActionButton onClick={() => onDownload(doc)} title="Download" colorClass="text-blue-600 dark:text-blue-400">
                <Download size={18} />
              </ActionButton>
              {!doc.is_archived && !doc.is_locked && canEdit(doc) && onEdit && (
                <ActionButton onClick={() => onEdit(doc)} title="Edit" colorClass="text-yellow-600 dark:text-yellow-400">
                  <Edit size={18} />
                </ActionButton>
              )}
              {!doc.is_archived && !doc.is_locked && canDelete(doc) && onDelete && (
                <ActionButton onClick={() => onDelete(doc)} title="Delete" colorClass="text-red-600 dark:text-red-400">
                  <Trash2 size={18} />
                </ActionButton>
              )}
              {!doc.is_archived && canArchive && onArchive && (
                <ActionButton onClick={() => onArchive(doc)} title="Archive" colorClass="text-purple-600 dark:text-purple-400">
                  <Archive size={18} />
                </ActionButton>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* md+: table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle dark:border-white/5 bg-gray-50/80 dark:bg-gray-900/40">
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Title</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Event</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Administration</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Uploaded By</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="py-3 px-4 text-gray-900 dark:text-white">
                  <span className="inline-flex items-center gap-2">
                    <FileTypeIcon fileType={doc.fileType} size={18} />
                    <span>{doc.title}</span>
                    {doc.is_locked && !doc.is_archived && (
                      <span
                        className="inline-flex items-center gap-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full"
                        title="Read-only — locked"
                      >
                        <Lock size={12} />
                        Locked
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{doc.category}</td>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{doc.event}</td>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{doc.administration}</td>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                  {uploaderNames[doc.uploadedBy] || 'Unknown'}
                </td>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                  {new Date(doc.uploadDate).toLocaleDateString()}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button onClick={() => onDownload(doc)} className="text-blue-500 hover:text-blue-700" title="Download">
                      <Download size={18} />
                    </button>
                    <button onClick={() => onView(doc)} className="text-green-500 hover:text-green-700" title="View">
                      <Eye size={18} />
                    </button>
                    {!doc.is_archived && !doc.is_locked && canEdit(doc) && onEdit && (
                      <button onClick={() => onEdit(doc)} className="text-yellow-500 hover:text-yellow-700" title="Edit">
                        <Edit size={18} />
                      </button>
                    )}
                    {!doc.is_archived && !doc.is_locked && canDelete(doc) && onDelete && (
                      <button onClick={() => onDelete(doc)} className="text-red-500 hover:text-red-700" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    )}
                    {!doc.is_archived && canArchive && onArchive && (
                      <button onClick={() => onArchive(doc)} className="text-purple-500 hover:text-purple-700" title="Archive">
                        <Archive size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-gray-900 dark:text-white break-words">{value}</dd>
    </div>
  )
}

function ActionButton({
  onClick,
  title,
  colorClass,
  children,
}: {
  onClick: () => void
  title: string
  colorClass: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] transition ${colorClass}`}
    >
      {children}
    </button>
  )
}
