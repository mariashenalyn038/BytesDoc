'use client'

import { useState } from 'react'
import { Document } from '@/types'
import { Download, Eye, Archive } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import FileTypeIcon from '@/components/ui/FileTypeIcon'

interface ArchiveListProps {
  documents: Document[]
  onView: (doc: Document) => void
  onDownload: (doc: Document) => void
  canBulkArchive?: boolean
  onBulkArchive?: (administration: string) => void | Promise<void>
  archivableDocs?: Document[]
  uploaderNames?: Record<string, string>
}

export default function ArchiveList({
  documents,
  onView,
  onDownload,
  canBulkArchive = false,
  onBulkArchive,
  archivableDocs = [],
  uploaderNames = {},
}: ArchiveListProps) {
  const [bulkArchiveAdmin, setBulkArchiveAdmin] = useState('')

  const archivableCounts = new Map<string, number>()
  for (const d of archivableDocs) {
    archivableCounts.set(d.administration, (archivableCounts.get(d.administration) ?? 0) + 1)
  }
  const archivableOptions = [...archivableCounts.entries()].sort(([a], [b]) => a.localeCompare(b))
  const selectedArchivableCount = bulkArchiveAdmin
    ? archivableCounts.get(bulkArchiveAdmin) ?? 0
    : 0

  return (
    <div className="space-y-4">
      {canBulkArchive && onBulkArchive && archivableOptions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Bulk Archive by Administration
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Archives every active document for the selected administration.
          </p>
          <div className="flex flex-wrap gap-2 items-stretch">
            <select
              value={bulkArchiveAdmin}
              onChange={e => setBulkArchiveAdmin(e.target.value)}
              className="flex-1 min-w-[220px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select administration…</option>
              {archivableOptions.map(([admin, count]) => (
                <option key={admin} value={admin}>
                  {admin} — {count} archivable
                </option>
              ))}
            </select>
            <Button
              disabled={!bulkArchiveAdmin}
              onClick={async () => {
                const target = bulkArchiveAdmin
                await onBulkArchive(target)
                setBulkArchiveAdmin('')
              }}
              variant="secondary"
            >
              {bulkArchiveAdmin
                ? `Archive all ${selectedArchivableCount} from ${bulkArchiveAdmin}`
                : 'Archive all'}
            </Button>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <EmptyState
            icon={Archive}
            title="No archived documents"
            description="Documents that get archived will appear here."
          />
        </div>
      ) : (
        <>
          {/* Mobile: card stack */}
          <div className="md:hidden space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
                <div className="flex items-start gap-2 min-w-0">
                  <FileTypeIcon fileType={doc.fileType} size={18} />
                  <p className="flex-1 min-w-0 font-semibold text-sm text-gray-900 dark:text-white break-words">
                    {doc.title}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</dt>
                    <dd className="text-gray-900 dark:text-white break-words">{doc.category}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Admin</dt>
                    <dd className="text-gray-900 dark:text-white break-words">{doc.administration}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Uploader</dt>
                    <dd className="text-gray-900 dark:text-white break-words">{uploaderNames[doc.uploadedBy] || 'Unknown'}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Archived</dt>
                    <dd className="text-gray-900 dark:text-white">{new Date(doc.uploadDate).toLocaleDateString()}</dd>
                  </div>
                </dl>
                <div className="flex gap-3 pt-2 border-t border-border-subtle dark:border-white/5">
                  <button onClick={() => onView(doc)} title="View" aria-label="View" className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] text-green-600 dark:text-green-400 transition">
                    <Eye size={18} />
                  </button>
                  <button onClick={() => onDownload(doc)} title="Download" aria-label="Download" className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] text-blue-600 dark:text-blue-400 transition">
                    <Download size={18} />
                  </button>
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
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Administration</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Uploaded By</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Archived Date</th>
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
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{doc.category}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{doc.administration}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {uploaderNames[doc.uploadedBy] || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {new Date(doc.uploadDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onDownload(doc)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => onView(doc)}
                          className="text-green-500 hover:text-green-700"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
