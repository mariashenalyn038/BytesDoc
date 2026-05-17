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
import BarChart from '@/components/charts/BarChart'
import DocumentTable from '@/components/dashboard/DocumentTable'
import ArchiveList from '@/components/dashboard/ArchiveList'
import DocumentViewerModal from '@/components/dashboard/DocumentViewerModal'
import UploadModal from '@/components/dashboard/UploadModal'
import { FileText, Archive, Upload } from 'lucide-react'
import { Document } from '@/types'
import { toast } from '@/lib/stores/toastStore'
import { confirmDialog } from '@/lib/stores/confirmStore'
import { useAdministrationStore } from '@/lib/stores/administrationStore'
import { useEventStore } from '@/lib/stores/eventStore'

export default function SecretaryDashboard() {
  return (
    <Suspense fallback={null}>
      <SecretaryDashboardContent />
    </Suspense>
  )
}

function SecretaryDashboardContent() {
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

  const SECRETARY_CATEGORIES = ['Proposals', 'Permits', 'Reports'] as const

  const [searchTerm, setSearchTerm] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [editForm, setEditForm] = useState({ title: '', category: '', event: '', administration: '' })

  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated || user?.role !== 'secretary') {
      router.push('/login')
    }
  }, [hasHydrated, isAuthenticated, user, router])

  if (!user) return null

  const tabs = [
    { name: 'Dashboard', href: '/dashboard/secretary' },
    { name: 'Documents', href: '/dashboard/secretary?tab=documents' },
    { name: 'Archive', href: '/dashboard/secretary?tab=archive' },
  ]

  const uploaderNames = users.reduce((acc, u) => {
    acc[u.id] = u.fullName
    return acc
  }, {} as Record<string, string>)

  // Filter out financial documents
  const accessibleDocs = documents.filter(d => d.category !== 'Financial Records')
  
  const filteredDocs = accessibleDocs.filter(d => {
    if (tab === 'documents') {
      const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase())
      return !d.is_archived && matchesSearch
    }
    return d.is_archived
  })

  const handleUpload = async (
    data: { title: string; category: string; event: string; administration: string },
    file?: File | null
  ) => {
    try {
      await addDocument(file ?? null, {
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

  const myUploads = accessibleDocs.filter(d => d.uploadedBy === user.id).length
  const totalDocs = accessibleDocs.filter(d => !d.is_archived).length
  const archivedDocs = accessibleDocs.filter(d => d.is_archived).length

  const categoryData = [
    { name: 'Proposals', value: accessibleDocs.filter(d => d.category === 'Proposals').length },
    { name: 'Permits', value: accessibleDocs.filter(d => d.category === 'Permits').length },
    { name: 'Reports', value: accessibleDocs.filter(d => d.category === 'Reports').length },
  ]

  const recentDocs = accessibleDocs.filter(d => !d.is_archived).slice(0, 5)

  return (
    <DashboardLayout tabs={tabs} activeTab={tab === 'documents' ? 'Documents' : tab === 'archive' ? 'Archive' : 'Dashboard'}>
      {tab === 'dashboard' && (
        <div className="space-y-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Secretary Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="My Uploads" value={myUploads} icon={<Upload size={32} />} />
            <Card title="Total Documents" value={totalDocs} icon={<FileText size={32} />} />
            <Card title="Archived Documents" value={archivedDocs} icon={<Archive size={32} />} />
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Documents per Category</h2>
            <BarChart data={categoryData} />
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Documents</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Title</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Category</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocs.map((doc) => (
                    <tr key={doc.id} className="border-b dark:border-gray-700">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{doc.title}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{doc.category}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documents</h1>
            <Button onClick={() => setUploadModalOpen(true)}>
              <Upload size={20} className="inline mr-2" />
              Upload Document
            </Button>
          </div>

          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />

          <DocumentTable
            documents={filteredDocs}
            canUpload={true}
            canEdit={(doc) => doc.uploadedBy === user.id}
            canDelete={(doc) => doc.uploadedBy === user.id}
            canArchive={false}
            onView={handleView}
            onDownload={handleDownload}
            onEdit={handleEditOpen}
            onDelete={handleDelete}
            uploaderNames={uploaderNames}
          />
        </div>
      )}

      {tab === 'archive' && (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Archive (Read Only)</h1>
          <ArchiveList
            documents={filteredDocs}
            onView={handleView}
            onDownload={handleDownload}
            uploaderNames={uploaderNames}
          />
        </div>
      )}

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
        allowedCategories={['Proposals', 'Permits', 'Reports']}
      />

      <DocumentViewerModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        document={selectedDoc}
      />

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Document">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Title</label>
            <input
              type="text"
              value={editForm.title}
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Category</label>
            <select
              value={editForm.category}
              onChange={e => setEditForm({ ...editForm, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              {SECRETARY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Event</label>
            <select
              value={editForm.event}
              onChange={e => setEditForm({ ...editForm, event: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              {events.map(evt => <option key={evt.id} value={evt.name}>{evt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Administration</label>
            <select
              value={editForm.administration}
              onChange={e => setEditForm({ ...editForm, administration: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              {administrations.map(adm => <option key={adm.id} value={adm.name}>{adm.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEditSave}>Save Changes</Button>
            <Button onClick={() => setEditModalOpen(false)} variant="secondary">Cancel</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
