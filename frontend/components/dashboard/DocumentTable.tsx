'use client'

import { Document } from '@/types'
import { Download, Eye, Edit, Trash2, Archive, FileText, Lock } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import FileTypeIcon from '@/components/ui/FileTypeIcon'

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
}: DocumentTableProps) {
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b dark:border-gray-700">
            <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Title</th>
            <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Category</th>
            <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Event</th>
            <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Administration</th>
            <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Uploaded By</th>
            <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Date</th>
            <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Actions</th>
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
                  {!doc.is_archived && !doc.is_locked && canEdit(doc) && onEdit && (
                    <button
                      onClick={() => onEdit(doc)}
                      className="text-yellow-500 hover:text-yellow-700"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                  )}
                  {!doc.is_archived && !doc.is_locked && canDelete(doc) && onDelete && (
                    <button
                      onClick={() => onDelete(doc)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  {!doc.is_archived && canArchive && onArchive && (
                    <button
                      onClick={() => onArchive(doc)}
                      className="text-purple-500 hover:text-purple-700"
                      title="Archive"
                    >
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
  )
}
