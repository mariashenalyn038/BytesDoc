'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { useDocumentStore } from '@/lib/stores/documentStore'
import { useUserStore } from '@/lib/stores/userStore'
import { useActivityStore } from '@/lib/stores/activityStore'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Eyebrow from '@/components/ui/Eyebrow'
import BarChart from '@/components/charts/BarChart'
import DocumentViewerModal from '@/components/dashboard/DocumentViewerModal'
import UploadModal from '@/components/dashboard/UploadModal'
import FolderExplorer from '@/components/dashboard/FolderExplorer'
import { FileTypeTile } from '@/components/ui/FileTypeIcon'
import { FileText, DollarSign, Upload, Archive, Activity } from 'lucide-react'
import { Document } from '@/types'
import { toast } from '@/lib/stores/toastStore'
import { confirmDialog } from '@/lib/stores/confirmStore'
import { useAdministrationStore } from '@/lib/stores/administrationStore'
import { useEventStore } from '@/lib/stores/eventStore'
import { useFolderStore } from '@/lib/stores/folderStore'

const FINANCE_CATEGORIES = ['Budgets', 'Financial Records', 'Reports'] as const

export default function FinanceDashboard() {
  return (
    <Suspense fallback={null}>
      <FinanceDashboardContent />
    </Suspense>
  )
}

function FinanceDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'

  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const { documents, addDocument, updateDocument, deleteDocument } = useDocumentStore()
  const { users } = useUserStore()
  const { addLog } = useActivityStore()
  const { administrations, ensureLoaded: ensureAdminsLoaded } = useAdministrationStore()
  const { events, ensureLoaded: ensureEventsLoaded } = useEventStore()

  useEffect(() => { ensureAdminsLoaded(); ensureEventsLoaded() }, [ensureAdminsLoaded, ensureEventsLoaded])

  const assignDocumentToFolder = useFolderStore(s => s.assignDocumentToFolder)

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [editForm, setEditForm] = useState({ title: '', category: '', event: '', administration: '' })
  const [uploadPrefill, setUploadPrefill] = useState<{ category: string; administration: string; event?: string } | null>(null)
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null)

  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated || user?.role !== 'finance_minister') {
      router.push('/login')
    }
  }, [hasHydrated, isAuthenticated, user, router])

  if (!user) return null

  const tabs = [
    { name: 'Dashboard', href: '/dashboard/finance' },
    { name: 'Documents', href: '/dashboard/finance?tab=documents' },
    { name: 'Archive', href: '/dashboard/finance?tab=archive' },
  ]

  const uploaderNames = users.reduce((acc, u) => {
    acc[u.id] = u.fullName
    return acc
  }, {} as Record<string, string>)

  const financialDocs = documents.filter(
    d => d.category === 'Budgets' || d.category === 'Financial Records' || d.category === 'Reports'
  )

  const handleUpload = async (
    data: { title: string; category: string; event: string; administration: string; folderId?: string | null },
    file?: File | null
  ) => {
    try {
      const doc = await addDocument(file ?? null, {
        ...data,
        fileType: file?.name.endsWith('.docx') ? 'docx' : 'pdf',
      }, {
        title: data.title,
        category: data.category as Document['category'],
        event: data.event,
        administration: data.administration,
        uploadedBy: user.id,
        uploadDate: new Date().toISOString(),
        filePath: '/mock/document.pdf',
        is_archived: false,
        is_locked: false,
        fileType: 'pdf',
      })
      const resolvedFolderId = data.folderId ?? targetFolderId
      if (resolvedFolderId && doc?.id) {
        assignDocumentToFolder(doc.id, resolvedFolderId)
        setTargetFolderId(null)
      }
      setUploadPrefill(null)
      setUploadModalOpen(false)
      toast.success('Document uploaded')
    } catch (e: any) {
      toast.error('Upload failed: ' + e.message)
    }
  }

  const handleView = (doc: Document) => {
    setSelectedDoc(doc)
    setViewModalOpen(true)
    addLog({ userId: user.id, action: 'view', documentId: doc.id })
  }

  const handleDownload = (doc: Document) => {
    addLog({ userId: user.id, action: 'download', documentId: doc.id })
    toast.info('Download started: ' + doc.title)
  }

  const handleDelete = async (doc: Document) => {
    const ok = await confirmDialog({
      title: 'Delete document?',
      message: `"${doc.title}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteDocument(doc.id)
      toast.success('Document deleted')
    } catch (e: any) {
      toast.error('Delete failed: ' + e.message)
    }
  }

  const handleEditOpen = (doc: Document) => {
    setSelectedDoc(doc)
    setEditForm({
      title: doc.title,
      category: doc.category,
      event: doc.event,
      administration: doc.administration,
    })
    setEditModalOpen(true)
  }

  const handleEditSave = async () => {
    if (!selectedDoc) return
    try {
      await updateDocument(selectedDoc.id, editForm as any)
      setEditModalOpen(false)
      toast.success('Document updated')
    } catch (e: any) {
      toast.error('Update failed: ' + e.message)
    }
  }

  const sortedAdmins = [...administrations].sort((a, b) => b.name.localeCompare(a.name))
  const currentAdmin = sortedAdmins[0]?.name || '2025-2026'
  const currentAdminDocs = financialDocs.filter(d => d.administration === currentAdmin)
  const myUploads = currentAdminDocs.filter(d => d.uploadedBy === user.id).length
  const totalDocs = currentAdminDocs.filter(d => !d.is_archived).length
  const archivedDocs = currentAdminDocs.filter(d => d.is_archived).length

  const categoryData = FINANCE_CATEGORIES.map(c => ({
    name: c,
    value: currentAdminDocs.filter(d => d.category === c).length,
  }))

  const recentDocs = [...currentAdminDocs]
    .filter(d => !d.is_archived)
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .slice(0, 5)

  return (
    <DashboardLayout
      tabs={tabs}
      activeTab={tab === 'documents' ? 'Documents' : tab === 'archive' ? 'Archive' : 'Dashboard'}
      onNewUpload={tab === 'documents' ? () => { setUploadPrefill(null); setTargetFolderId(null); setUploadModalOpen(true) } : undefined}
    >
      {tab === 'dashboard' && (
        <div className="px-6 pt-5 pb-8 space-y-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Finance Minister
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
              Welcome back, {user.fullName.split(' ')[0]}
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
              Manage budgets, financial records, and reports for the{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">{currentAdmin}</span> administration.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card title="My uploads" value={myUploads} icon={<Upload size={22} />} accent="emerald" />
            <Card title="Active documents" value={totalDocs} icon={<DollarSign size={22} />} accent="blue" />
            <Card title="Archived" value={archivedDocs} icon={<Archive size={22} />} accent="amber" />
          </div>

          <div className="bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Distribution
                </div>
                <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
                  Documents per category
                </h2>
              </div>
              <Eyebrow><Activity size={11} /> {currentAdmin}</Eyebrow>
            </div>
            <BarChart data={categoryData} />
          </div>

          <div className="bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Recent documents</h2>
              <button
                onClick={() => router.push('/dashboard/finance?tab=documents')}
                className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                View all →
              </button>
            </div>
            {recentDocs.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No documents yet.</p>
            ) : (
              <ul className="divide-y divide-border-subtle dark:divide-white/5">
                {recentDocs.map(d => (
                  <li
                    key={d.id}
                    onClick={() => handleView(d)}
                    className="group cursor-pointer flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.025] transition-colors"
                  >
                    <FileTypeTile fileType={d.fileType} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[13px] text-gray-900 dark:text-white">{d.title}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {d.category} · {new Date(d.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="px-6 pt-5 pb-8">
          <FolderExplorer
            documents={documents}
            users={users}
            role={user.role}
            onView={handleView}
            onDownload={handleDownload}
            onEdit={handleEditOpen}
            onDelete={handleDelete}
            uploaderNames={uploaderNames}
            onUploadRequested={(prefill, folderId) => {
              setUploadPrefill(prefill)
              setTargetFolderId(folderId)
              setUploadModalOpen(true)
            }}
          />
        </div>
      )}

      {tab === 'archive' && (
        <div className="px-6 pt-5 pb-8">
          <FolderExplorer
            documents={documents}
            users={users}
            role={user.role}
            isArchive={true}
            onView={handleView}
            onDownload={handleDownload}
            uploaderNames={uploaderNames}
          />
        </div>
      )}

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => { setUploadModalOpen(false); setUploadPrefill(null); setTargetFolderId(null) }}
        onUpload={handleUpload}
        role={user.role}
        allowedCategories={['Budgets', 'Financial Records', 'Reports']}
        prefill={uploadPrefill ? { ...uploadPrefill, folderId: targetFolderId } : null}
      />

      <DocumentViewerModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        document={selectedDoc}
        uploaderName={selectedDoc ? uploaderNames[selectedDoc.uploadedBy] : undefined}
      />

      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        eyebrow="Document"
        title="Edit details"
        width={520}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditSave}>Save changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={editForm.title}
            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
          />
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Category
            </span>
            <select
              value={editForm.category}
              onChange={e => setEditForm({ ...editForm, category: e.target.value })}
              className="w-full text-[13px] px-3 py-2 rounded-lg ring-1 ring-border-subtle dark:ring-white/10 bg-white dark:bg-white/[0.02] text-gray-900 dark:text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:focus-visible:ring-white/40 transition-shadow"
            >
              {FINANCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Event
            </span>
            <select
              value={editForm.event}
              onChange={e => setEditForm({ ...editForm, event: e.target.value })}
              className="w-full text-[13px] px-3 py-2 rounded-lg ring-1 ring-border-subtle dark:ring-white/10 bg-white dark:bg-white/[0.02] text-gray-900 dark:text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:focus-visible:ring-white/40 transition-shadow"
            >
              {events.map(evt => <option key={evt.id} value={evt.name}>{evt.name}</option>)}
            </select>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Administration
            </span>
            <select
              value={editForm.administration}
              onChange={e => setEditForm({ ...editForm, administration: e.target.value })}
              className="w-full text-[13px] px-3 py-2 rounded-lg ring-1 ring-border-subtle dark:ring-white/10 bg-white dark:bg-white/[0.02] text-gray-900 dark:text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:focus-visible:ring-white/40 transition-shadow"
            >
              {administrations.map(adm => <option key={adm.id} value={adm.name}>{adm.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
