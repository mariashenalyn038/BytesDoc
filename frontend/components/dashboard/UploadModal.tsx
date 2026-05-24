'use client'

import { useEffect, useRef, useState } from 'react'
import { UploadCloud, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { toast } from '@/lib/stores/toastStore'
import { useAdministrationStore } from '@/lib/stores/administrationStore'
import { useEventStore } from '@/lib/stores/eventStore'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.pdf', '.docx']

function validateFile(f: File): string | null {
  const ext = '.' + (f.name.split('.').pop()?.toLowerCase() ?? '')
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return 'Only PDF and DOCX files are supported.'
  }
  if (f.size > MAX_FILE_BYTES) {
    return 'File is too large (max 10 MB).'
  }
  return null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (
    data: { title: string; category: string; event: string; administration: string },
    file?: File | null
  ) => void | Promise<void>
  allowedCategories: string[]
  prefill?: { category?: string; administration?: string; event?: string } | null
}

export default function UploadModal({
  isOpen,
  onClose,
  onUpload,
  allowedCategories,
  prefill,
}: UploadModalProps) {
  const { administrations, ensureLoaded } = useAdministrationStore()
  const { events, ensureLoaded: ensureEventsLoaded } = useEventStore()
  const [formData, setFormData] = useState({
    title: '',
    category: allowedCategories[0] ?? '',
    event: '',
    administration: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File | null) => {
    if (!f) {
      setFile(null)
      return
    }
    const error = validateFile(f)
    if (error) {
      toast.error(error)
      return
    }
    setFile(f)
  }

  const clearFile = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!isDragging) setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files?.[0] ?? null)
  }

  useEffect(() => {
    if (isOpen) {
      void ensureLoaded()
      void ensureEventsLoaded()
      if (prefill) {
        setFormData({
          title: '',
          category: prefill.category ?? allowedCategories[0] ?? '',
          administration: prefill.administration ?? (administrations[0]?.name || ''),
          event: prefill.event ?? (events[0]?.name || ''),
        })
      }
    }
  }, [isOpen, ensureLoaded, ensureEventsLoaded, prefill])

  useEffect(() => {
    if (!formData.administration && administrations.length > 0) {
      setFormData(f => ({ ...f, administration: administrations[0].name }))
    }
  }, [administrations, formData.administration])

  useEffect(() => {
    if (!formData.category && allowedCategories.length > 0) {
      setFormData(f => ({ ...f, category: allowedCategories[0] }))
    }
  }, [allowedCategories, formData.category])

  useEffect(() => {
    if (!formData.event && events.length > 0) {
      setFormData(f => ({ ...f, event: events[0].name }))
    }
  }, [events, formData.event])

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title')
      return
    }
    if (!formData.category) {
      toast.error('Please select a category')
      return
    }
    if (!formData.event) {
      toast.error('Please select an event')
      return
    }
    if (!formData.administration) {
      toast.error('Please select an administration')
      return
    }
    setIsUploading(true)
    try {
      await onUpload(formData, file)
      setFormData({
        title: '',
        category: allowedCategories[0] ?? '',
        event: events[0]?.name ?? '',
        administration: administrations[0]?.name ?? '',
      })
      setFile(null)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Document">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
            Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            placeholder="Enter document title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
            Category
          </label>
          <select
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            {allowedCategories.length === 0 && (
              <option value="" disabled>No categories available for your role yet</option>
            )}
            {allowedCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
            Event
          </label>
          <select
            value={formData.event}
            onChange={e => setFormData({ ...formData, event: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            {events.length === 0 && (
              <option value="" disabled>No events yet — add one in Document Settings → Events</option>
            )}
            {events.map(evt => (
              <option key={evt.id} value={evt.name}>{evt.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
            Administration
          </label>
          <select
            value={formData.administration}
            onChange={e => setFormData({ ...formData, administration: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            {administrations.length === 0 && (
              <option value="" disabled>No administrations yet — add one in the Administrations tab</option>
            )}
            {administrations.map(adm => (
              <option key={adm.id} value={adm.name}>{adm.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
            File
          </label>
          <label
            htmlFor="upload-file-input"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`block cursor-pointer rounded-lg border-2 border-dashed px-6 py-6 text-center transition ${
              isDragging
                ? 'border-gray-900 bg-gray-50 dark:border-white dark:bg-white/[0.04]'
                : file
                  ? 'border-gray-300 dark:border-gray-600'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50/50 dark:hover:bg-white/[0.02]'
            }`}
          >
            <input
              id="upload-file-input"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={e => handleFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <UploadCloud size={20} className="shrink-0 text-gray-500 dark:text-gray-400" />
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="ml-2 p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition"
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-2 pointer-events-none">
                <UploadCloud size={32} className="mx-auto text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Drag and drop</span> your file here, or{' '}
                  <span className="font-medium text-gray-900 dark:text-white">click to browse</span>
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">PDF or DOCX · max 10 MB</p>
              </div>
            )}
          </label>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSubmit} isLoading={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
          <Button onClick={onClose} variant="secondary" disabled={isUploading}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}