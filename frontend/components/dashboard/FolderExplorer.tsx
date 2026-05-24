'use client'

import { useState } from 'react'
import { Folder as FolderIcon, FileText, ChevronRight, Home, Plus, Trash2, ArrowLeft, Upload, Eye, Download, Edit, Archive } from 'lucide-react'
import { Document, Role } from '@/types'
import { useFolderStore, Folder } from '@/lib/stores/folderStore'
import { useAdministrationStore } from '@/lib/stores/administrationStore'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { FileTypeBadge } from '@/components/ui/FileTypeIcon'
import { confirmDialog } from '@/lib/stores/confirmStore'
import { toast } from '@/lib/stores/toastStore'

// Define the hierarchy of departments and their sub-categories
const HIERARCHY: Record<string, string[]> = {
  Finance: ['Budget Proposal', 'Liquidation', 'Financial Statement', 'Expense Receipts'],
  Secretary: ['Proposals', 'Permits', 'Minutes of Meetings', 'Reports'],
  MOPI: ['Press Releases', 'Announcements', 'Newsletters'],
  Judiciary: ['Bylaws', 'Constitutions', 'Case Records'],
  Election: ['Candidacy Profiles', 'Voter Registries', 'Election Results'],
  Event: ['Freshmen Orientation', 'Election 2025', 'Foundation Day']
}

const DEPT_COLORS: Record<string, string> = {
  Finance: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
  Secretary: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-900/50',
  MOPI: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50',
  Judiciary: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
  Election: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-900/50',
  Event: 'bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400 border-sky-200 dark:border-sky-900/50'
}

interface FolderExplorerProps {
  documents: Document[]
  role: Role
  isArchive?: boolean
  onView: (doc: Document) => void
  onDownload: (doc: Document) => void
  onEdit?: (doc: Document) => void
  onDelete?: (doc: Document) => void
  onArchive?: (doc: Document) => void
  onUploadRequested?: (prefill: { category: string; administration: string; event?: string }, folderId: string) => void
  uploaderNames: Record<string, string>
}

export default function FolderExplorer({
  documents,
  role,
  isArchive = false,
  onView,
  onDownload,
  onEdit,
  onDelete,
  onArchive,
  onUploadRequested,
  uploaderNames
}: FolderExplorerProps) {
  const { folders, documentFolders, addFolder, deleteFolder } = useFolderStore()
  const { administrations } = useAdministrationStore()

  // ── Navigation State ──────────────────────────────────────────────────
  const [currentDept, setCurrentDept] = useState<string | null>(null)
  const [currentSubCat, setCurrentSubCat] = useState<string | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  
  // Administration Filter (defaults to the latest administration)
  const sortedAdmins = [...administrations].sort((a, b) => b.name.localeCompare(a.name))
  const defaultAdmin = sortedAdmins[0]?.name || '2025-2026'
  const [selectedAdmin, setSelectedAdmin] = useState<string>(defaultAdmin)

  // Folder creation modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Determine allowed departments based on user role
  const allowedDepts = Object.keys(HIERARCHY).filter(dept => {
    if (role === 'chief_minister' || role === 'member') return true
    if (role === 'finance_minister') return dept === 'Finance'
    if (role === 'secretary') return dept === 'Secretary' || dept === 'Event' || dept === 'MOPI' || dept === 'Judiciary' || dept === 'Election'
    return false
  })

  // Safe navigation if current dept is not allowed
  const activeDept = currentDept && allowedDepts.includes(currentDept) ? currentDept : (allowedDepts.length === 1 ? allowedDepts[0] : null)

  const activeFolder = folders.find(f => f.id === currentFolderId)

  // ── Breadcrumb Handlers ───────────────────────────────────────────────
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

  // ── Derived Data ──────────────────────────────────────────────────────
  // Folders created in the current subcategory & active administration
  const displayedUserFolders = folders.filter(
    f => f.parentCategory === activeDept && f.category === currentSubCat && f.administration === selectedAdmin
  )

  // Documents in the current subcategory, active administration, and archived filter
  const matchingDocs = documents.filter(d => {
    const belongsToAdmin = d.administration === selectedAdmin
    const isArchivedMatch = d.is_archived === isArchive

    // Map sub-category folder mappings or check category directly
    const mappedCategory = d.category

    if (currentSubCat) {
      // In subcategory view or nested folder view:
      // In MSU BYTES standard, backend categories are 'Proposals', 'Permits', 'Budgets', 'Reports', 'Financial Records'.
      // We map these dynamically:
      const categoryMatches = 
        (currentSubCat === 'Budget Proposal' && mappedCategory === 'Budgets') ||
        (currentSubCat === 'Liquidation' && mappedCategory === 'Financial Records') ||
        (currentSubCat === 'Financial Statement' && mappedCategory === 'Financial Records') ||
        (currentSubCat === 'Expense Receipts' && mappedCategory === 'Financial Records') ||
        (currentSubCat === 'Proposals' && mappedCategory === 'Proposals') ||
        (currentSubCat === 'Permits' && mappedCategory === 'Permits') ||
        (currentSubCat === 'Minutes of Meetings' && mappedCategory === 'Reports') ||
        (currentSubCat === 'Reports' && mappedCategory === 'Reports') ||
        // fallback match
        mappedCategory.toLowerCase().replace(/\s+/g, '') === currentSubCat.toLowerCase().replace(/\s+/g, '') ||
        (activeDept === 'Finance' && (mappedCategory === 'Budgets' || mappedCategory === 'Financial Records' || mappedCategory === 'Reports') && currentSubCat === 'Budget Proposal') ||
        (activeDept === 'Secretary' && (mappedCategory === 'Proposals' || mappedCategory === 'Permits' || mappedCategory === 'Reports') && currentSubCat === 'Proposals')

      return belongsToAdmin && isArchivedMatch && categoryMatches
    }

    // In department view, count overall docs
    if (activeDept) {
      if (activeDept === 'Finance') {
        return belongsToAdmin && isArchivedMatch && (mappedCategory === 'Budgets' || mappedCategory === 'Financial Records' || mappedCategory === 'Reports')
      } else {
        return belongsToAdmin && isArchivedMatch && mappedCategory !== 'Budgets' && mappedCategory !== 'Financial Records'
      }
    }

    return belongsToAdmin && isArchivedMatch
  })

  // Filter documents inside the active folder vs loose files
  const folderDocuments = matchingDocs.filter(d => documentFolders[d.id] === currentFolderId)
  const looseDocuments = matchingDocs.filter(d => {
    const isMappedToAnotherFolder = !!documentFolders[d.id]
    return !isMappedToAnotherFolder
  })

  // ── Actions ───────────────────────────────────────────────────────────
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

  const handleDeleteFolder = async (folder: Folder) => {
    const ok = await confirmDialog({
      title: 'Delete folder?',
      message: `"${folder.name}" will be deleted. Files inside will be unassigned but not deleted.`,
      confirmLabel: 'Delete',
      variant: 'danger'
    })
    if (!ok) return
    deleteFolder(folder.id)
    toast.success('Folder deleted')
  }

  return (
    <div className="space-y-6">
      {/* ── TOP CONTROL BAR: BREADCRUMBS & ADMINISTRATION ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700/60">
        {/* Breadcrumbs */}
        <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
          <button
            onClick={resetToRoot}
            className="flex items-center gap-1 hover:text-primary dark:hover:text-white transition font-medium"
          >
            <Home size={16} />
            <span>Root</span>
          </button>

          {activeDept && (
            <>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
              <button
                onClick={() => navigateToDept(activeDept)}
                className={`hover:text-primary dark:hover:text-white transition font-medium ${!currentSubCat ? 'text-gray-900 dark:text-white' : ''}`}
              >
                {activeDept}
              </button>
            </>
          )}

          {currentSubCat && (
            <>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
              <button
                onClick={() => navigateToSubCat(currentSubCat)}
                className={`hover:text-primary dark:hover:text-white transition font-medium ${!currentFolderId ? 'text-gray-900 dark:text-white' : ''}`}
              >
                {currentSubCat}
              </button>
            </>
          )}

          {currentFolderId && activeFolder && (
            <>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
              <span className="text-gray-900 dark:text-white font-semibold break-all">
                {activeFolder.name}
              </span>
            </>
          )}
        </div>

        {/* Administration Term Selector (only allowed at Root to avoid folder sync bugs) */}
        {!activeDept && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Administration:
            </span>
            <select
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            >
              {sortedAdmins.map(adm => (
                <option key={adm.id} value={adm.name}>{adm.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── 1. ROOT VIEW: Main Department Folders ────────────────────────── */}
      {!activeDept && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {allowedDepts.map((dept) => {
            // Count total files in this department
            const deptDocsCount = documents.filter(d => {
              const belongsToAdmin = d.administration === selectedAdmin
              const isArchivedMatch = d.is_archived === isArchive
              const isDeptMatch = dept === 'Finance'
                ? (d.category === 'Budgets' || d.category === 'Financial Records' || d.category === 'Reports')
                : (d.category !== 'Budgets' && d.category !== 'Financial Records')
              return belongsToAdmin && isArchivedMatch && isDeptMatch
            }).length

            return (
              <div
                key={dept}
                onClick={() => navigateToDept(dept)}
                className="group relative cursor-pointer flex items-center gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow border border-gray-100 dark:border-gray-700/60 hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <div className={`p-4 rounded-xl border ${DEPT_COLORS[dept]} transition-all group-hover:scale-110`}>
                  <FolderIcon size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-primary dark:group-hover:text-white transition">
                    {dept}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {deptDocsCount} files • {HIERARCHY[dept].length} sub-categories
                  </p>
                </div>
                <ChevronRight className="text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition group-hover:translate-x-1" size={18} />
              </div>
            )
          })}
        </div>
      )}

      {/* ── 2. DEPARTMENT VIEW: Department Sub-Categories ────────────────── */}
      {activeDept && !currentSubCat && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button
              onClick={resetToRoot}
              className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {activeDept} Sub-categories
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {HIERARCHY[activeDept].map((subCat) => {
              const subCatDocsCount = documents.filter(d => {
                const belongsToAdmin = d.administration === selectedAdmin
                const isArchivedMatch = d.is_archived === isArchive
                const categoryMatches = 
                  (subCat === 'Budget Proposal' && d.category === 'Budgets') ||
                  (subCat === 'Liquidation' && d.category === 'Financial Records') ||
                  (subCat === 'Financial Statement' && d.category === 'Financial Records') ||
                  (subCat === 'Expense Receipts' && d.category === 'Financial Records') ||
                  (subCat === 'Proposals' && d.category === 'Proposals') ||
                  (subCat === 'Permits' && d.category === 'Permits') ||
                  (subCat === 'Minutes of Meetings' && d.category === 'Reports') ||
                  (subCat === 'Reports' && d.category === 'Reports') ||
                  d.category.toLowerCase().replace(/\s+/g, '') === subCat.toLowerCase().replace(/\s+/g, '')
                return belongsToAdmin && isArchivedMatch && categoryMatches
              }).length

              const subCatFoldersCount = folders.filter(
                f => f.parentCategory === activeDept && f.category === subCat && f.administration === selectedAdmin
              ).length

              return (
                <div
                  key={subCat}
                  onClick={() => navigateToSubCat(subCat)}
                  className="group relative cursor-pointer flex items-center gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow border border-gray-100 dark:border-gray-700/60 hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  <div className={`p-4 rounded-xl border ${DEPT_COLORS[activeDept]} transition-all group-hover:scale-110`}>
                    <FolderIcon size={32} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-primary dark:group-hover:text-white transition">
                      {subCat}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {subCatDocsCount} files • {subCatFoldersCount} folders
                    </p>
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition group-hover:translate-x-1" size={18} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 3. SUB-CATEGORY VIEW: Custom Folders & Loose Documents ──────── */}
      {activeDept && currentSubCat && !currentFolderId && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateToDept(activeDept)}
                className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition"
                title="Back"
              >
                <ArrowLeft size={16} />
              </button>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentSubCat} Folders
              </h2>
            </div>

            {role !== 'member' && !isArchive && (
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus size={18} className="mr-1 inline" />
                Create Folder
              </Button>
            )}
          </div>

          {/* User folders list */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
              Folders
            </h3>
            {displayedUserFolders.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-700 p-8 rounded-2xl text-center">
                <FolderIcon size={40} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No folders created yet in this section.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {displayedUserFolders.map((folder) => {
                  const folderDocsCount = matchingDocs.filter(d => documentFolders[d.id] === folder.id).length

                  return (
                    <div
                      key={folder.id}
                      className="group relative bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700/60 hover:shadow-lg transition flex items-center justify-between"
                    >
                      <div
                        onClick={() => setCurrentFolderId(folder.id)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <FolderIcon size={24} className="text-yellow-500 shrink-0" />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary dark:group-hover:text-white transition">
                            {folder.name}
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {folderDocsCount} files
                          </p>
                        </div>
                      </div>

                      {role !== 'member' && !isArchive && (
                        <button
                          onClick={() => handleDeleteFolder(folder)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition shrink-0 ml-2"
                          title="Delete folder"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Loose Documents (Not in any folder) */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
              Loose Files
            </h3>
            {looseDocuments.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-700 p-8 rounded-2xl text-center">
                <FileText size={40} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No files outside of folders.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700/60 overflow-hidden">
                <DocumentSubTable
                  documents={looseDocuments}
                  onView={onView}
                  onDownload={onDownload}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onArchive={onArchive}
                  isArchive={isArchive}
                  role={role}
                  uploaderNames={uploaderNames}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. NESTED FOLDER VIEW: Files inside a folder ──────────────────── */}
      {currentFolderId && activeFolder && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentFolderId(null)}
                className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition"
                title="Back"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="flex items-center gap-2">
                <FolderIcon size={24} className="text-yellow-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white break-all">
                  {activeFolder.name}
                </h2>
              </div>
            </div>

            {role !== 'member' && !isArchive && onUploadRequested && (
              <Button
                onClick={() =>
                  onUploadRequested(
                    {
                      category:
                        currentSubCat === 'Budget Proposal' ? 'Budgets' :
                        (currentSubCat === 'Liquidation' || currentSubCat === 'Financial Statement' || currentSubCat === 'Expense Receipts') ? 'Financial Records' :
                        currentSubCat === 'Proposals' ? 'Proposals' :
                        currentSubCat === 'Permits' ? 'Permits' : 'Reports',
                      administration: selectedAdmin
                    },
                    currentFolderId
                  )
                }
              >
                <Upload size={18} className="mr-1 inline" />
                Upload Document
              </Button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700/60 overflow-hidden">
            {folderDocuments.length === 0 ? (
              <div className="p-12 text-center">
                <FileText size={40} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  This folder is empty. Upload documents to get started!
                </p>
              </div>
            ) : (
              <DocumentSubTable
                documents={folderDocuments}
                onView={onView}
                onDownload={onDownload}
                onEdit={onEdit}
                onDelete={onDelete}
                onArchive={onArchive}
                isArchive={isArchive}
                role={role}
                uploaderNames={uploaderNames}
              />
            )}
          </div>
        </div>
      )}

      {/* ── CREATE FOLDER MODAL ───────────────────────────────────────────── */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Folder"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Folder Name
            </label>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              placeholder="e.g. Budget liquidation reports Q1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder()
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={handleCreateFolder}>Create</Button>
            <Button onClick={() => setCreateModalOpen(false)} variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── SUB-TABLE COMPONENT FOR DOCUMENT LISTS ─────────────────────────────────
interface DocumentSubTableProps {
  documents: Document[]
  onView: (doc: Document) => void
  onDownload: (doc: Document) => void
  onEdit?: (doc: Document) => void
  onDelete?: (doc: Document) => void
  onArchive?: (doc: Document) => void
  isArchive: boolean
  role: Role
  uploaderNames: Record<string, string>
}

function DocumentSubTable({
  documents,
  onView,
  onDownload,
  onEdit,
  onDelete,
  onArchive,
  isArchive,
  role,
  uploaderNames
}: DocumentSubTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400">
            <th className="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">Title</th>
            <th className="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">Uploaded By</th>
            <th className="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">Date</th>
            <th className="text-right py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {documents.map((doc) => (
            <tr
              key={doc.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
            >
              <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                <div className="flex items-center gap-2">
                  <FileTypeBadge fileType={doc.fileType} />
                  <span className="truncate max-w-[240px] sm:max-w-[360px]" title={doc.title}>
                    {doc.title}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                {uploaderNames[doc.uploadedBy] || 'Unknown'}
              </td>
              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                {new Date(doc.uploadDate).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onView(doc)}
                    className="p-1.5 text-gray-400 hover:text-primary dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                    title="View Document"
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    onClick={() => onDownload(doc)}
                    className="p-1.5 text-gray-400 hover:text-primary dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                    title="Download"
                  >
                    <Download size={16} />
                  </button>

                  {role !== 'member' && !isArchive && (
                    <>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(doc)}
                          className="p-1.5 text-gray-400 hover:text-primary dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                      )}

                      {onArchive && (
                        <button
                          onClick={() => onArchive(doc)}
                          className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                          title="Archive"
                        >
                          <Archive size={16} />
                        </button>
                      )}

                      {onDelete && (
                        <button
                          onClick={() => onDelete(doc)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </>
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
