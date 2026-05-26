'use client'

import { useMemo, useState } from 'react'
import {
  ChevronRight,
  Home,
  Folder as FolderIcon,
  Plus,
  Trash2,
  ArrowLeft,
  Upload,
  Eye,
  Download,
  Edit,
  Archive as ArchiveIcon,
  Inbox,
  MoreHorizontal,
  Calendar,
} from 'lucide-react'
import { Document, Role, User } from '@/types'
import { useFolderStore, Folder } from '@/lib/stores/folderStore'
import { useAdministrationStore } from '@/lib/stores/administrationStore'
import {
  DEPARTMENT_HIERARCHY as HIERARCHY,
  subCategoryMatches,
  deptCategoryMatches,
  subcategoryToUploadCategory,
  allowedDepartmentsForRole,
} from '@/lib/departments'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Eyebrow from '@/components/ui/Eyebrow'
import Avatar from '@/components/ui/Avatar'
import DataTable, { Td } from '@/components/ui/DataTable'
import { FileTypeTile } from '@/components/ui/FileTypeIcon'
import EmptyState from '@/components/ui/EmptyState'
import AdministrationsPanel from '@/components/dashboard/AdministrationsPanel'
import { confirmDialog } from '@/lib/stores/confirmStore'
import { toast } from '@/lib/stores/toastStore'

interface DeptTone {
  iconBg: string
  iconFg: string
  hoverIconBg: string
  hoverIconFg: string
}

const DEPT_TONES: Record<string, DeptTone> = {
  Finance:   { iconBg: 'bg-blue-50 dark:bg-blue-500/10',       iconFg: 'text-blue-600 dark:text-blue-400',       hoverIconBg: 'group-hover:bg-blue-100 dark:group-hover:bg-blue-500/15',       hoverIconFg: 'group-hover:text-blue-700 dark:group-hover:text-blue-300' },
  Secretary: { iconBg: 'bg-violet-50 dark:bg-violet-500/10',   iconFg: 'text-violet-600 dark:text-violet-400',   hoverIconBg: 'group-hover:bg-violet-100 dark:group-hover:bg-violet-500/15',   hoverIconFg: 'group-hover:text-violet-700 dark:group-hover:text-violet-300' },
  MOPI:      { iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconFg: 'text-emerald-600 dark:text-emerald-400', hoverIconBg: 'group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/15', hoverIconFg: 'group-hover:text-emerald-700 dark:group-hover:text-emerald-300' },
  Judiciary: { iconBg: 'bg-amber-50 dark:bg-amber-500/10',     iconFg: 'text-amber-600 dark:text-amber-400',     hoverIconBg: 'group-hover:bg-amber-100 dark:group-hover:bg-amber-500/15',     hoverIconFg: 'group-hover:text-amber-700 dark:group-hover:text-amber-300' },
  Election:  { iconBg: 'bg-rose-50 dark:bg-rose-500/10',       iconFg: 'text-rose-600 dark:text-rose-400',       hoverIconBg: 'group-hover:bg-rose-100 dark:group-hover:bg-rose-500/15',       hoverIconFg: 'group-hover:text-rose-700 dark:group-hover:text-rose-300' },
  Event:     { iconBg: 'bg-sky-50 dark:bg-sky-500/10',         iconFg: 'text-sky-600 dark:text-sky-400',         hoverIconBg: 'group-hover:bg-sky-100 dark:group-hover:bg-sky-500/15',         hoverIconFg: 'group-hover:text-sky-700 dark:group-hover:text-sky-300' },
}

const DEFAULT_TONE: DeptTone = {
  iconBg: 'bg-gray-100 dark:bg-white/[0.06]',
  iconFg: 'text-gray-700 dark:text-gray-300',
  hoverIconBg: 'group-hover:bg-amber-50 dark:group-hover:bg-amber-500/15',
  hoverIconFg: 'group-hover:text-amber-600 dark:group-hover:text-amber-300',
}

interface FolderExplorerProps {
  documents: Document[]
  users?: User[]
  role: Role
  isArchive?: boolean
  onView: (doc: Document) => void
  onDownload: (doc: Document) => void
  onEdit?: (doc: Document) => void
  onDelete?: (doc: Document) => void
  onArchive?: (doc: Document) => void
  onUploadRequested?: (prefill: { category: string; administration: string; event?: string; department?: string; subCategory?: string }, folderId: string) => void
  uploaderNames: Record<string, string>
}

export default function FolderExplorer({
  documents,
  users = [],
  role,
  isArchive = false,
  onView,
  onDownload,
  onEdit,
  onDelete,
  onArchive,
  onUploadRequested,
  uploaderNames,
}: FolderExplorerProps) {
  const { folders, documentFolders, addFolder, deleteFolder } = useFolderStore()
  const { administrations } = useAdministrationStore()

  const [currentDept, setCurrentDept] = useState<string | null>(null)
  const [currentSubCat, setCurrentSubCat] = useState<string | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)

  const sortedAdmins = useMemo(
    () => [...administrations].sort((a, b) => b.name.localeCompare(a.name)),
    [administrations]
  )
  const defaultAdmin = sortedAdmins[0]?.name || '2025-2026'
  const [selectedAdmin, setSelectedAdmin] = useState<string>(defaultAdmin)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [adminsModalOpen, setAdminsModalOpen] = useState(false)

  const usersById = useMemo(() => {
    const m = new Map<string, User>()
    for (const u of users) m.set(u.id, u)
    return m
  }, [users])

  const allowedDepts = useMemo(() => allowedDepartmentsForRole(role), [role])

  const activeDept =
    currentDept && allowedDepts.includes(currentDept)
      ? currentDept
      : allowedDepts.length === 1
        ? allowedDepts[0]
        : null

  const activeFolder = folders.find(f => f.id === currentFolderId)

  const resetToRoot = () => {
    setCurrentDept(null)
    setCurrentSubCat(null)
    setCurrentFolderId(null)
  }
  const navigateToDept = (dept: string) => {
    setCurrentDept(dept)
    setCurrentSubCat(null)
    setCurrentFolderId(null)
  }
  const navigateToSubCat = (subCat: string) => {
    setCurrentSubCat(subCat)
    setCurrentFolderId(null)
  }

  const displayedUserFolders = folders.filter(
    f => f.parentCategory === activeDept && f.category === currentSubCat && f.administration === selectedAdmin
  )

  const matchingDocs = documents.filter(d => {
    const belongsToAdmin = d.administration === selectedAdmin
    const isArchivedMatch = d.is_archived === isArchive
    if (!belongsToAdmin || !isArchivedMatch) return false
    if (currentSubCat) return subCategoryMatches(currentSubCat, d.category)
    if (activeDept) return deptCategoryMatches(activeDept, d.category)
    return true
  })

  const folderDocuments = matchingDocs.filter(d => documentFolders[d.id] === currentFolderId)
  const looseDocuments = matchingDocs.filter(d => !documentFolders[d.id])

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name cannot be empty')
      return
    }
    if (activeDept && currentSubCat) {
      const created = addFolder(newFolderName, currentSubCat, activeDept, selectedAdmin)
      setNewFolderName('')
      setCreateModalOpen(false)
      toast.success(`Folder "${created.name}" created`)
    }
  }

  const handleDeleteFolder = async (folder: Folder, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const ok = await confirmDialog({
      title: 'Delete folder?',
      message: `"${folder.name}" will be deleted. Files inside will be unassigned but not deleted.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    deleteFolder(folder.id)
    toast.success('Folder deleted')
  }

  const handleRequestUpload = () => {
    if (!onUploadRequested || !activeDept || !currentSubCat || !currentFolderId) return
    onUploadRequested(
      {
        category: subcategoryToUploadCategory(currentSubCat),
        administration: selectedAdmin,
        department: activeDept,
        subCategory: currentSubCat,
      },
      currentFolderId
    )
  }

  const docCanWrite = role !== 'member' && !isArchive

  return (
    <div className="space-y-5">
      {/* Breadcrumb + admin selector / actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[13px] flex-wrap">
          <button
            onClick={resetToRoot}
            className={`inline-flex items-center gap-1 transition-colors ${
              !activeDept ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Home size={13} /> Root
          </button>
          {activeDept && (
            <>
              <ChevronRight size={12} className="text-gray-400" />
              <button
                onClick={() => navigateToDept(activeDept)}
                className={`transition-colors ${
                  !currentSubCat ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {activeDept}
              </button>
            </>
          )}
          {currentSubCat && (
            <>
              <ChevronRight size={12} className="text-gray-400" />
              <button
                onClick={() => navigateToSubCat(currentSubCat)}
                className={`transition-colors ${
                  !currentFolderId ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {currentSubCat}
              </button>
            </>
          )}
          {currentFolderId && activeFolder && (
            <>
              <ChevronRight size={12} className="text-gray-400" />
              <span className="font-semibold text-gray-900 dark:text-white break-all">{activeFolder.name}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!activeDept && sortedAdmins.length > 0 && (
            <div className="relative">
              <select
                value={selectedAdmin}
                onChange={e => setSelectedAdmin(e.target.value)}
                className="appearance-none text-[12px] font-medium rounded-full pl-3 pr-7 py-1 ring-1 ring-border-subtle dark:ring-white/10 text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.04] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {sortedAdmins.map(a => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
              <ChevronRight
                size={11}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none rotate-90"
              />
            </div>
          )}
          {role === 'chief_minister' && !isArchive && (
            <Button variant="outline" size="sm" icon={Calendar} onClick={() => setAdminsModalOpen(true)}>
              Administrations
            </Button>
          )}
          {currentFolderId && docCanWrite && onUploadRequested && (
            <Button variant="primary" size="sm" icon={Upload} onClick={handleRequestUpload}>
              Upload
            </Button>
          )}
          {currentSubCat && !currentFolderId && docCanWrite && (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateModalOpen(true)}>
              New folder
            </Button>
          )}
        </div>
      </div>

      {/* ── ROOT VIEW: departments ─────────────────────────────────────── */}
      {!activeDept && (
        <>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Departments
              </div>
              <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
                Browse the council archive
              </h2>
            </div>
            <Eyebrow>{selectedAdmin}</Eyebrow>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allowedDepts.map(dept => {
              const tone = DEPT_TONES[dept] ?? DEFAULT_TONE
              const count = documents.filter(d =>
                d.administration === selectedAdmin
                && d.is_archived === isArchive
                && deptCategoryMatches(dept, d.category)
              ).length
              return (
                <DeptTile
                  key={dept}
                  name={dept}
                  fileCount={count}
                  subCount={HIERARCHY[dept].length}
                  tone={tone}
                  onClick={() => navigateToDept(dept)}
                />
              )
            })}
          </div>
        </>
      )}

      {/* ── DEPARTMENT VIEW: sub-categories ─────────────────────────────── */}
      {activeDept && !currentSubCat && (
        <>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <BackButton onClick={resetToRoot} />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {activeDept}
                </div>
                <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
                  Sub-categories
                </h2>
              </div>
            </div>
            <Eyebrow>{selectedAdmin}</Eyebrow>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {HIERARCHY[activeDept].map(subCat => {
              const tone = DEPT_TONES[activeDept] ?? DEFAULT_TONE
              const filesCount = documents.filter(d =>
                d.administration === selectedAdmin
                && d.is_archived === isArchive
                && subCategoryMatches(subCat, d.category)
              ).length
              const foldersCount = folders.filter(
                f => f.parentCategory === activeDept && f.category === subCat && f.administration === selectedAdmin
              ).length
              return (
                <SubCatTile
                  key={subCat}
                  name={subCat}
                  fileCount={filesCount}
                  folderCount={foldersCount}
                  tone={tone}
                  onClick={() => navigateToSubCat(subCat)}
                />
              )
            })}
          </div>
        </>
      )}

      {/* ── SUB-CATEGORY VIEW: custom folders + loose files ────────────── */}
      {activeDept && currentSubCat && !currentFolderId && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <BackButton onClick={() => navigateToDept(activeDept)} />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {activeDept} · {currentSubCat}
              </div>
              <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
                Folders &amp; files
              </h2>
            </div>
          </div>

          {/* User folders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Folders
              </div>
            </div>
            {displayedUserFolders.length === 0 ? (
              <div className="rounded-xl bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft">
                <EmptyState
                  icon={FolderIcon}
                  title="No folders here yet"
                  description={docCanWrite ? 'Create a folder to group related files.' : 'Folders will appear here once created.'}
                  action={docCanWrite ? (
                    <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreateModalOpen(true)}>
                      New folder
                    </Button>
                  ) : undefined}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {displayedUserFolders.map(folder => {
                  const folderDocsCount = matchingDocs.filter(d => documentFolders[d.id] === folder.id).length
                  return (
                    <UserFolderTile
                      key={folder.id}
                      name={folder.name}
                      count={folderDocsCount}
                      canDelete={docCanWrite}
                      onClick={() => setCurrentFolderId(folder.id)}
                      onDelete={e => handleDeleteFolder(folder, e)}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Loose files */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Loose files
                </div>
                <div className="text-base font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
                  {looseDocuments.length} {looseDocuments.length === 1 ? 'item' : 'items'}
                </div>
              </div>
              <Eyebrow>Sorted by recent</Eyebrow>
            </div>
            {looseDocuments.length === 0 ? (
              <div className="rounded-xl bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft">
                <EmptyState
                  icon={Inbox}
                  title="No loose files"
                  description="All files in this sub-category are organized inside folders."
                />
              </div>
            ) : (
              <DocumentsTable
                docs={looseDocuments}
                usersById={usersById}
                uploaderNames={uploaderNames}
                role={role}
                isArchive={isArchive}
                onView={onView}
                onDownload={onDownload}
                onEdit={onEdit}
                onDelete={onDelete}
                onArchive={onArchive}
              />
            )}
          </div>
        </div>
      )}

      {/* ── NESTED FOLDER VIEW: files inside a custom folder ───────────── */}
      {currentFolderId && activeFolder && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BackButton onClick={() => setCurrentFolderId(null)} />
            <div className="flex items-center gap-2 min-w-0">
              <FolderIcon size={18} className="text-amber-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {activeDept} · {currentSubCat}
                </div>
                <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white truncate">
                  {activeFolder.name}
                </h2>
              </div>
            </div>
          </div>

          {folderDocuments.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft">
              <EmptyState
                icon={Inbox}
                title="This folder is empty"
                description={docCanWrite ? 'Upload a document to get started.' : 'Files placed in this folder will appear here.'}
                action={docCanWrite && onUploadRequested ? (
                  <Button variant="primary" size="sm" icon={Upload} onClick={handleRequestUpload}>
                    Upload
                  </Button>
                ) : undefined}
              />
            </div>
          ) : (
            <DocumentsTable
              docs={folderDocuments}
              usersById={usersById}
              uploaderNames={uploaderNames}
              role={role}
              isArchive={isArchive}
              onView={onView}
              onDownload={onDownload}
              onEdit={onEdit}
              onDelete={onDelete}
              onArchive={onArchive}
            />
          )}
        </div>
      )}

      {/* Manage administrations modal */}
      <Modal
        isOpen={adminsModalOpen}
        onClose={() => setAdminsModalOpen(false)}
        eyebrow="Council terms"
        title="Manage administrations"
        width={760}
      >
        <AdministrationsPanel />
      </Modal>

      {/* Create folder modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        eyebrow="Organize"
        title="Create a new folder"
        width={460}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={Plus} onClick={handleCreateFolder}>Create folder</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            icon={FolderIcon}
            label="Folder name"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            placeholder="e.g. Budget liquidation reports Q1"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder() }}
          />
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Will be created under{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {activeDept} · {currentSubCat}
            </span>{' '}
            for the <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedAdmin}</span> administration.
          </p>
        </div>
      </Modal>
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Back"
      className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
    >
      <ArrowLeft size={16} />
    </button>
  )
}

function DeptTile({
  name,
  fileCount,
  subCount,
  tone,
  onClick,
}: {
  name: string
  fileCount: number
  subCount: number
  tone: DeptTone
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-xl bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all duration-200 p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`size-11 rounded-lg grid place-items-center ${tone.iconBg} ${tone.iconFg} transition-colors ${tone.hoverIconBg} ${tone.hoverIconFg}`}>
          <FolderIcon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{name}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
            {fileCount} {fileCount === 1 ? 'file' : 'files'} · {subCount} sub-categories
          </div>
        </div>
        <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  )
}

function SubCatTile({
  name,
  fileCount,
  folderCount,
  tone,
  onClick,
}: {
  name: string
  fileCount: number
  folderCount: number
  tone: DeptTone
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-xl bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all duration-200 p-3.5"
    >
      <div className="flex items-start justify-between">
        <div className={`size-9 rounded-lg grid place-items-center ${tone.iconBg} ${tone.iconFg} transition-colors ${tone.hoverIconBg} ${tone.hoverIconFg}`}>
          <FolderIcon size={17} />
        </div>
        <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
      </div>
      <div className="mt-2 text-[13px] font-semibold text-gray-900 dark:text-white truncate">{name}</div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
        {fileCount} {fileCount === 1 ? 'file' : 'files'} · {folderCount} {folderCount === 1 ? 'folder' : 'folders'}
      </div>
    </button>
  )
}

function UserFolderTile({
  name,
  count,
  canDelete,
  onClick,
  onDelete,
}: {
  name: string
  count: number
  canDelete: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      className="group relative cursor-pointer rounded-xl bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all duration-200 p-3.5"
    >
      <div className="flex items-start justify-between">
        <div className="size-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300 grid place-items-center">
          <FolderIcon size={17} />
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            aria-label="Delete folder"
            title="Delete folder"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="mt-2 text-[13px] font-semibold text-gray-900 dark:text-white truncate">{name}</div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
        {count} {count === 1 ? 'file' : 'files'}
      </div>
    </div>
  )
}

interface DocumentsTableProps {
  docs: Document[]
  usersById: Map<string, User>
  uploaderNames: Record<string, string>
  role: Role
  isArchive: boolean
  onView: (doc: Document) => void
  onDownload: (doc: Document) => void
  onEdit?: (doc: Document) => void
  onDelete?: (doc: Document) => void
  onArchive?: (doc: Document) => void
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function DocumentsTable({
  docs,
  usersById,
  uploaderNames,
  role,
  isArchive,
  onView,
  onDownload,
  onEdit,
  onDelete,
  onArchive,
}: DocumentsTableProps) {
  const sorted = [...docs].sort(
    (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
  )
  const canWrite = role !== 'member' && !isArchive
  return (
    <DataTable
      columns={[
        { label: 'Name' },
        { label: 'Type', width: '90px' },
        { label: 'Owner', width: '220px' },
        { label: 'Modified', width: '140px' },
        { label: '', width: '120px', align: 'right' },
      ]}
      footer={`Showing ${sorted.length} of ${sorted.length}`}
    >
      {sorted.map(d => {
        const owner = usersById.get(d.uploadedBy)
        const ownerName = owner?.fullName ?? uploaderNames[d.uploadedBy] ?? 'Unknown'
        const ownerRole: Role = (owner?.role ?? 'member') as Role
        return (
          <tr
            key={d.id}
            onClick={() => onView(d)}
            className="cursor-pointer hover:bg-gray-50/70 dark:hover:bg-white/[0.025] transition-colors"
          >
            <Td>
              <div className="flex items-center gap-3">
                <FileTypeTile fileType={d.fileType} />
                <span className="font-medium text-gray-900 dark:text-white truncate" title={d.title}>{d.title}</span>
              </div>
            </Td>
            <Td>
              <span className="text-gray-500 dark:text-gray-400 uppercase text-[11px] font-semibold tracking-wider">
                {d.fileType}
              </span>
            </Td>
            <Td>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={ownerName} role={ownerRole} size={22} />
                <span className="truncate">{ownerName}</span>
              </div>
            </Td>
            <Td className="tabular-nums">{relativeTime(d.uploadDate)}</Td>
            <Td align="right">
              <div className="inline-flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                <RowIconButton title="View" onClick={() => onView(d)} icon={Eye} />
                <RowIconButton title="Download" onClick={() => onDownload(d)} icon={Download} />
                {canWrite && onEdit && <RowIconButton title="Edit" onClick={() => onEdit(d)} icon={Edit} />}
                {canWrite && onArchive && <RowIconButton title="Archive" onClick={() => onArchive(d)} icon={ArchiveIcon} hoverTone="amber" />}
                {canWrite && onDelete && <RowIconButton title="Delete" onClick={() => onDelete(d)} icon={Trash2} hoverTone="red" />}
                {!canWrite && !onEdit && !onArchive && !onDelete && (
                  <span className="text-gray-300 dark:text-gray-600 px-2">
                    <MoreHorizontal size={14} />
                  </span>
                )}
              </div>
            </Td>
          </tr>
        )
      })}
    </DataTable>
  )
}

function RowIconButton({
  title,
  onClick,
  icon: Icon,
  hoverTone = 'default',
}: {
  title: string
  onClick: () => void
  icon: typeof Eye
  hoverTone?: 'default' | 'amber' | 'red'
}) {
  const hover =
    hoverTone === 'red'
      ? 'hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
      : hoverTone === 'amber'
        ? 'hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
        : 'hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md text-gray-400 transition-colors ${hover}`}
    >
      <Icon size={14} />
    </button>
  )
}
