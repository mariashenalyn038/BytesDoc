'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, Folder as FolderIcon, Calendar, FileText, Sparkles, X, Building2, Tag, FolderTree } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FileTypeTile } from '@/components/ui/FileTypeIcon'
import { toast } from '@/lib/stores/toastStore'
import { useAdministrationStore } from '@/lib/stores/administrationStore'
import { useEventStore } from '@/lib/stores/eventStore'
import { useFolderStore } from '@/lib/stores/folderStore'
import {
  DEPARTMENT_HIERARCHY,
  DEPARTMENTS,
  subcategoryToUploadCategory,
  allowedDepartmentsForRole,
} from '@/lib/departments'

const MAX_FILE_BYTES = 25 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.pdf', '.docx']

function validateFile(f: File): string | null {
  const ext = '.' + (f.name.split('.').pop()?.toLowerCase() ?? '')
  if (!ALLOWED_EXTENSIONS.includes(ext)) return 'Only PDF and DOCX files are supported.'
  if (f.size > MAX_FILE_BYTES) return 'File is too large (max 25 MB).'
  return null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileExt(name: string): 'pdf' | 'docx' {
  return name.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf'
}

export interface UploadFormData {
  title: string
  category: string
  event: string
  administration: string
  folderId?: string | null
}

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (data: UploadFormData, file?: File | null) => void | Promise<void>
  /** Pre-existing API: list of upload-time categories for back-compat. We map to a department whitelist instead. */
  allowedCategories?: string[]
  /** Role used to determine which departments can be selected. */
  role?: 'chief_minister' | 'finance_minister' | 'secretary' | 'member'
  prefill?: {
    category?: string
    administration?: string
    event?: string
    department?: string
    subCategory?: string
    folderId?: string | null
  } | null
}

export default function UploadModal({
  isOpen,
  onClose,
  onUpload,
  allowedCategories,
  role,
  prefill,
}: UploadModalProps) {
  const { administrations, ensureLoaded } = useAdministrationStore()
  const { events, ensureLoaded: ensureEventsLoaded } = useEventStore()
  const { folders } = useFolderStore()

  const allowedDepts = useMemo(() => {
    if (role) return allowedDepartmentsForRole(role)
    // Fallback: if allowedCategories suggests a finance/secretary scope, narrow appropriately.
    if (allowedCategories) {
      const ac = new Set(allowedCategories)
      if (ac.has('Budgets') && !ac.has('Proposals')) return ['Finance']
      if (ac.has('Proposals') && !ac.has('Budgets')) return ['Secretary', 'Event', 'MOPI', 'Judiciary', 'Election']
    }
    return DEPARTMENTS
  }, [role, allowedCategories])

  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState<string>(allowedDepts[0] ?? '')
  const [subCategory, setSubCategory] = useState<string>('')
  const [event, setEvent] = useState('')
  const [administration, setAdministration] = useState('')
  const [folderId, setFolderId] = useState<string>('') // '' means "no folder"
  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const subCategoriesForDept = useMemo(
    () => (department ? DEPARTMENT_HIERARCHY[department] ?? [] : []),
    [department]
  )

  const matchingFolders = useMemo(() => {
    if (!department || !subCategory || !administration) return []
    return folders.filter(
      f =>
        f.parentCategory === department &&
        f.category === subCategory &&
        f.administration === administration
    )
  }, [folders, department, subCategory, administration])

  // Hydrate stores when opening
  useEffect(() => {
    if (!isOpen) return
    void ensureLoaded()
    void ensureEventsLoaded()
  }, [isOpen, ensureLoaded, ensureEventsLoaded])

  // Apply prefill once each time the modal opens (avoid re-running on parent re-renders)
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true
    if (prefill?.department && allowedDepts.includes(prefill.department)) {
      setDepartment(prefill.department)
    } else if (allowedDepts.length > 0 && !allowedDepts.includes(department)) {
      setDepartment(allowedDepts[0])
    }
    if (prefill?.subCategory) setSubCategory(prefill.subCategory)
    if (prefill?.administration) setAdministration(prefill.administration)
    if (prefill?.event) setEvent(prefill.event)
    setFolderId(prefill?.folderId ?? '')
  }, [isOpen, prefill, allowedDepts, department])

  // Auto-fix sub-category when department changes
  useEffect(() => {
    if (subCategoriesForDept.length === 0) {
      setSubCategory('')
      return
    }
    if (!subCategoriesForDept.includes(subCategory)) {
      setSubCategory(subCategoriesForDept[0])
    }
  }, [department, subCategoriesForDept])

  // Default administration / event when stores load
  useEffect(() => {
    if (!administration && administrations.length > 0) {
      // newest administration first by name
      const sorted = [...administrations].sort((a, b) => b.name.localeCompare(a.name))
      setAdministration(sorted[0].name)
    }
  }, [administrations, administration])
  useEffect(() => {
    if (!event && events.length > 0) setEvent(events[0].name)
  }, [events, event])

  // Clear folder selection when its scope no longer applies
  useEffect(() => {
    if (!folderId) return
    const stillValid = matchingFolders.some(f => f.id === folderId)
    if (!stillValid) setFolderId('')
  }, [matchingFolders, folderId])

  const handleFile = (f: File | null) => {
    if (!f) { setFile(null); setProgress(0); return }
    const error = validateFile(f)
    if (error) { toast.error(error); return }
    setFile(f)
    setProgress(100)
  }

  const clearFile = () => {
    setFile(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Please enter a title'); return }
    if (!department) { toast.error('Please choose a department'); return }
    if (!subCategory) { toast.error('Please choose a sub-category'); return }
    if (!event) { toast.error('Please select an event'); return }
    if (!administration) { toast.error('Please select an administration'); return }
    const category = subcategoryToUploadCategory(subCategory)
    setIsUploading(true)
    try {
      await onUpload(
        {
          title,
          category,
          event,
          administration,
          folderId: folderId || null,
        },
        file
      )
      setTitle('')
      setFile(null)
      setProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const dropTone = isDragging
    ? 'border-gray-500 dark:border-white/40 bg-gray-100/60 dark:bg-white/[0.04]'
    : 'border-border-subtle dark:border-white/15 bg-gray-50/60 dark:bg-white/[0.02] hover:border-gray-400 dark:hover:border-white/25'

  const sortedAdmins = [...administrations].sort((a, b) => b.name.localeCompare(a.name))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Add to archive"
      title="Upload a document"
      width={580}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button variant="primary" icon={Upload} onClick={handleSubmit} isLoading={isUploading}>
            Upload
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Dropzone */}
        <label
          htmlFor="upload-file-input"
          onDragOver={e => { e.preventDefault(); if (!isDragging) setIsDragging(true) }}
          onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
          onDrop={e => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0] ?? null) }}
          className={`block cursor-pointer rounded-xl border border-dashed ${dropTone} px-5 py-6 text-center transition-colors`}
        >
          <input
            id="upload-file-input"
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          <div className="mx-auto size-11 rounded-full grid place-items-center bg-white dark:bg-white/[0.04] ring-1 ring-border-subtle dark:ring-white/10">
            <Upload size={18} className="text-gray-600 dark:text-gray-300" />
          </div>
          <div className="mt-2.5 text-[13px] font-medium text-gray-900 dark:text-white">
            Drag &amp; drop or{' '}
            <span className="text-blue-600 dark:text-blue-400 underline underline-offset-2">browse</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            PDF or DOCX · up to 25 MB
          </div>
        </label>

        {/* Selected file preview */}
        {file && (
          <div className="flex items-center gap-3 rounded-lg ring-1 ring-border-subtle dark:ring-white/10 bg-white dark:bg-white/[0.02] px-3 py-2">
            <FileTypeTile fileType={fileExt(file.name)} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-gray-900 dark:text-white truncate">{file.name}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">{formatBytes(file.size)}</div>
            </div>
            <div className="w-24">
              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/[0.06] overflow-hidden">
                <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 text-right tabular-nums">{progress}%</div>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
              aria-label="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Department + Sub-category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField
            icon={Building2}
            label="Department"
            value={department}
            onChange={setDepartment}
            options={allowedDepts.map(d => ({ value: d, label: d }))}
            disabled={allowedDepts.length <= 1}
          />
          <SelectField
            icon={Tag}
            label="Sub-category"
            value={subCategory}
            onChange={setSubCategory}
            options={subCategoriesForDept.map(s => ({ value: s, label: s }))}
            disabled={subCategoriesForDept.length === 0}
          />
        </div>

        {/* Folder (optional) */}
        <SelectField
          icon={FolderTree}
          label="Folder"
          value={folderId}
          onChange={setFolderId}
          options={[
            { value: '', label: matchingFolders.length === 0 ? 'No folders here yet — file as loose' : 'Loose (no folder)' },
            ...matchingFolders.map(f => ({ value: f.id, label: f.name })),
          ]}
        />

        {/* Title + Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            icon={FileText}
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Council Meeting Minutes — Sept 24, 2026"
          />
          <Input
            icon={Calendar}
            label="Document date"
            type="date"
            value={docDate}
            onChange={e => setDocDate(e.target.value)}
          />
        </div>

        {/* Administration + Event */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField
            icon={FolderIcon}
            label="Administration"
            value={administration}
            onChange={setAdministration}
            options={sortedAdmins.map(a => ({ value: a.name, label: a.name }))}
          />
          <SelectField
            icon={Calendar}
            label="Event"
            value={event}
            onChange={setEvent}
            options={events.map(ev => ({ value: ev.name, label: ev.name }))}
          />
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2 text-[12px] text-gray-600 dark:text-gray-300 bg-blue-50/60 dark:bg-blue-500/10 ring-1 ring-blue-100 dark:ring-blue-500/20 rounded-lg px-3 py-2">
          <Sparkles size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <span>
            Filing under{' '}
            <span className="font-semibold">{department || '—'}</span>
            {subCategory && <> · <span className="font-semibold">{subCategory}</span></>}
            {folderId && (
              <> · <span className="font-semibold">{matchingFolders.find(f => f.id === folderId)?.name}</span></>
            )}.
          </span>
        </div>
      </div>
    </Modal>
  )
}

function SelectField({
  icon: Icon,
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  icon?: any
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </span>
      <div className="relative">
        {Icon && (
          <Icon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
          />
        )}
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none text-[13px] ${Icon ? 'pl-8' : 'pl-3'} pr-8 py-2 rounded-lg ring-1 ring-border-subtle dark:ring-white/10 bg-white dark:bg-white/[0.02] text-gray-900 dark:text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:focus-visible:ring-white/40 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none"
        >
          ▾
        </span>
      </div>
    </label>
  )
}
