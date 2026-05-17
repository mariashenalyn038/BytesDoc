'use client'


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
import LineChart from '@/components/charts/LineChart'
import DocumentTable from '@/components/dashboard/DocumentTable'
import ArchiveList from '@/components/dashboard/ArchiveList'
import DocumentViewerModal from '@/components/dashboard/DocumentViewerModal'
import UploadModal from '@/components/dashboard/UploadModal'
import UserTable from '@/components/dashboard/UserTable'
import ActivityLogTable from '@/components/dashboard/ActivityLogTable'
import AdministrationsPanel from '@/components/dashboard/AdministrationsPanel'
import FileTypeIcon from '@/components/ui/FileTypeIcon'
import { useAdministrationStore } from '@/lib/stores/administrationStore'
import { FileText, Archive, Upload, Users, Activity, Download } from 'lucide-react'
import { Document, User } from '@/types'
import { apiGetDashboardStats, DashboardStats } from '@/lib/api'
import { mockCategories } from '@/lib/mockData'
import { toast } from '@/lib/stores/toastStore'
import { confirmDialog } from '@/lib/stores/confirmStore'

const TABS = [
  { name: 'Dashboard', href: '/dashboard/admin' },
  { name: 'Documents', href: '/dashboard/admin?tab=documents' },
  { name: 'Archive', href: '/dashboard/admin?tab=archive' },
  { name: 'Administrations', href: '/dashboard/admin?tab=administrations' },
  { name: 'Users', href: '/dashboard/admin?tab=users' },
  { name: 'Activity Logs', href: '/dashboard/admin?tab=logs' },
]

export default function AdminDashboard() {
  return (
    <Suspense fallback={null}>
      <AdminDashboardContent />
    </Suspense>
  )
}

function AdminDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'

  const { user, isAuthenticated, usingMock, hasHydrated } = useAuthStore()
  const {
    documents,
    fetchDocuments,
    addDocument,
    updateDocument,
    deleteDocument,
    archiveDocument,
    bulkArchiveByAdministration,
    getDownloadUrl,
  } = useDocumentStore()
  const { users, fetchUsers, updateUserRole, inviteUser } = useUserStore()
  const { logs, remoteLogs, fetchLogs, exportLogs } = useActivityStore()
  const { administrations, ensureLoaded: ensureAdminsLoaded } = useAdministrationStore()

  // ── Local UI state ──────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [editForm, setEditForm] = useState({ title: '', category: '', event: '', administration: '' })
  const [inviteForm, setInviteForm] = useState({ email: '', fullName: '', role: 'member' as User['role'] })
  const [filterUser, setFilterUser] = useState('All')
  const [filterAction, setFilterAction] = useState('All')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isInviting, setIsInviting] = useState(false)

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated || user?.role !== 'chief_minister') {
      router.push('/login')
    }
  }, [hasHydrated, isAuthenticated, user, router])

  // ── Data fetching ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    fetchDocuments()
    fetchUsers()
    ensureAdminsLoaded()
  }, [user])

  useEffect(() => {
    if (!user) return
    if (tab === 'logs') fetchLogs({ userId: filterUser === 'All' ? undefined : filterUser, action: filterAction === 'All' ? undefined : filterAction })
  }, [tab, filterUser, filterAction, user])

  useEffect(() => {
    if (!user || tab !== 'dashboard') return
    if (usingMock) {
      // Build stats from local mock store
      const active = documents.filter(d => !d.is_archived)
      const archived = documents.filter(d => d.is_archived)
      const sevenAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      setStats({
        totalDocuments: documents.length,
        activeDocuments: active.length,
        archivedDocuments: archived.length,
        recentUploads: active.filter(d => new Date(d.uploadDate) >= sevenAgo).length,
        myUploads: documents.filter(d => d.uploadedBy === user.id).length,
        docsPerCategory: mockCategories.map(c => ({
          name: c,
          value: documents.filter(d => d.category === c).length,
        })),
        uploadsOverTime: buildUploadsOverTime(documents),
        recentDocuments: active.slice(0, 5).map(d => ({
          id: d.id,
          title: d.title,
          category: d.category,
          uploadDate: d.uploadDate,
          uploaderName: users.find(u => u.id === d.uploadedBy)?.fullName ?? 'Unknown',
        })),
        activitySummary: null,
      })
    } else {
      apiGetDashboardStats().then(setStats).catch(console.error)
    }
  }, [tab, documents, users, user, usingMock])

  if (!user) return null

  // ── Derived data ────────────────────────────────────────────────────────
  const uploaderNames = users.reduce((acc, u) => { acc[u.id] = u.fullName; return acc }, {} as Record<string, string>)

  const activeDocs = documents.filter(d => !d.is_archived)
  const archivedDocs = documents.filter(d => d.is_archived)

  const filteredActiveDocs = activeDocs.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCat = categoryFilter === 'All' || d.category === categoryFilter
    return matchSearch && matchCat
  })

  // Activity logs — use remoteLogs if backend is up, else local mock logs
  const displayLogs = usingMock ? logs : remoteLogs.map(r => ({
    id: r.id,
    userId: r.userId,
    action: r.action as any,
    documentId: r.documentId ?? undefined,
    timestamp: r.timestamp,
  }))

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleUpload = async (data: { title: string; category: string; event: string; administration: string }, file?: File | null) => {
    try {
      await addDocument(file ?? null, { ...data, fileType: file?.name.endsWith('.docx') ? 'docx' : 'pdf' }, {
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
  }

  const handleDownload = async (doc: Document) => {
    try {
      const url = await getDownloadUrl(doc.id)
      window.open(url, '_blank')
    } catch {
      toast.info('Download started: ' + doc.title)
    }
  }

  const handleEditOpen = (doc: Document) => {
    setSelectedDoc(doc)
    setEditForm({ title: doc.title, category: doc.category, event: doc.event, administration: doc.administration })
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

  const handleArchive = async (doc: Document) => {
    const ok = await confirmDialog({
      title: 'Archive document?',
      message: `"${doc.title}" will become read-only.`,
      confirmLabel: 'Archive',
    })
    if (!ok) return
    try {
      await archiveDocument(doc.id)
      toast.success('Document archived')
    } catch (e: any) {
      toast.error('Archive failed: ' + e.message)
    }
  }

  const handleBulkArchive = async (administration: string) => {
    const ok = await confirmDialog({
      title: 'Bulk archive?',
      message: `Archive ALL documents from administration "${administration}"?`,
      confirmLabel: 'Archive all',
    })
    if (!ok) return
    try {
      await bulkArchiveByAdministration(administration)
      toast.success(`Archived all docs from ${administration}`)
    } catch (e: any) {
      toast.error('Bulk archive failed: ' + e.message)
    }
  }

  const handleInviteUser = async () => {
    if (!inviteForm.email || !inviteForm.fullName) {
      toast.error('Email and name are required')
      return
    }
    setIsInviting(true)
    try {
      await inviteUser({
        email: inviteForm.email,
        fullName: inviteForm.fullName,
        role: inviteForm.role,
      })
      const target = inviteForm.email
      setInviteForm({ email: '', fullName: '', role: 'member' })
      setInviteModalOpen(false)
      toast.success(usingMock ? 'User added (demo mode)' : `Invite email sent to ${target}`)
    } catch (e: any) {
      toast.error(e?.message ?? 'Invite failed')
    } finally {
      setIsInviting(false)
    }
  }

  const handleExportLogs = () => exportLogs({
    userId: filterUser === 'All' ? undefined : filterUser,
    action: filterAction === 'All' ? undefined : filterAction,
  })

  return (
    <DashboardLayout tabs={TABS} activeTab={tabLabel(tab)}>
      {/* ── DASHBOARD TAB ─────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            {usingMock && (
              <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-3 py-1 rounded-full">
                Demo Mode (backend offline)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card title="Total Documents" value={stats?.totalDocuments ?? documents.length} icon={<FileText size={32} />} />
            <Card title="Active Documents" value={stats?.activeDocuments ?? activeDocs.length} icon={<FileText size={32} />} />
            <Card title="Archived Documents" value={stats?.archivedDocuments ?? archivedDocs.length} icon={<Archive size={32} />} />
            <Card title="Recent Uploads (7d)" value={stats?.recentUploads ?? 0} icon={<Upload size={32} />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Documents per Category</h2>
              <BarChart data={stats?.docsPerCategory ?? []} />
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Uploads over Time</h2>
              <LineChart data={stats?.uploadsOverTime ?? []} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Documents</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Title</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Category</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Uploader</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Date</th>
                    <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.recentDocuments ?? activeDocs.slice(0, 5).map(d => ({
                    id: d.id, title: d.title, category: d.category,
                    uploadDate: d.uploadDate, uploaderName: uploaderNames[d.uploadedBy] ?? 'Unknown',
                  }))).map(d => (
                    <tr key={d.id} className="border-b dark:border-gray-700">
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        <span className="inline-flex items-center gap-2">
                          {(() => {
                            const ft = documents.find(doc => doc.id === d.id)?.fileType ?? 'pdf'
                            return <FileTypeIcon fileType={ft} size={18} />
                          })()}
                          <span>{d.title}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{d.category}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{d.uploaderName}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {new Date(d.uploadDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDownload(documents.find(doc => doc.id === d.id)!)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── DOCUMENTS TAB ─────────────────────────────────────── */}
      {tab === 'documents' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documents</h1>
            <Button onClick={() => setUploadModalOpen(true)}>
              <Upload size={20} className="inline mr-2" />
              Upload Document
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <div className="flex gap-2 flex-wrap">
              {['All', ...mockCategories].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    categoryFilter === cat
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <DocumentTable
            documents={filteredActiveDocs}
            canUpload={true}
            canEdit={() => true}
            canDelete={() => true}
            canArchive={true}
            onView={handleView}
            onDownload={handleDownload}
            onEdit={handleEditOpen}
            onDelete={handleDelete}
            onArchive={handleArchive}
            uploaderNames={uploaderNames}
          />
        </div>
      )}

      {/* ── ARCHIVE TAB ──────────────────────────────────────── */}
      {tab === 'archive' && (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Archive</h1>
          <ArchiveList
            documents={archivedDocs}
            archivableDocs={activeDocs}
            onView={handleView}
            onDownload={handleDownload}
            canBulkArchive={true}
            onBulkArchive={handleBulkArchive}
            uploaderNames={uploaderNames}
          />
        </div>
      )}

      {/* ── ADMINISTRATIONS TAB ──────────────────────────────── */}
      {tab === 'administrations' && <AdministrationsPanel />}

      {/* ── USERS TAB ─────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <Button onClick={() => setInviteModalOpen(true)}>
              <Users size={20} className="inline mr-2" />
              Invite User
            </Button>
          </div>
          <UserTable
            users={users}
            onRoleChange={(id, role) => updateUserRole(id, role)}
          />
        </div>
      )}

      {/* ── ACTIVITY LOGS TAB ────────────────────────────────── */}
      {tab === 'logs' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>
            <Button onClick={handleExportLogs} variant="secondary">
              <Download size={20} className="inline mr-2" />
              Export CSV
            </Button>
          </div>
          <ActivityLogTable
            logs={displayLogs}
            users={users}
            documents={documents}
            filterUser={filterUser}
            filterAction={filterAction}
            onFilterUserChange={setFilterUser}
            onFilterActionChange={setFilterAction}
          />
        </div>
      )}

      {/* ── MODALS ───────────────────────────────────────────── */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
        allowedCategories={mockCategories}
      />

      <DocumentViewerModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        document={selectedDoc}
        uploaderName={selectedDoc ? uploaderNames[selectedDoc.uploadedBy] : undefined}
        onEdit={(doc) => { setViewModalOpen(false); handleEditOpen(doc) }}
        onRename={(doc) => { setViewModalOpen(false); handleEditOpen(doc) }}
        onDelete={async (doc) => { setViewModalOpen(false); await handleDelete(doc) }}
      />

      {/* Edit Modal */}
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
              {mockCategories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Event</label>
            <input
              type="text"
              value={editForm.event}
              onChange={e => setEditForm({ ...editForm, event: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Administration</label>
            <select
              value={editForm.administration}
              onChange={e => setEditForm({ ...editForm, administration: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              {administrations.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEditSave}>Save Changes</Button>
            <Button onClick={() => setEditModalOpen(false)} variant="secondary">Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Invite User Modal */}
      <Modal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite New User">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {usingMock
              ? 'Demo mode: this adds the user to local state only. No email is sent.'
              : 'An invite email will be sent to this address. The recipient sets their password from the link, then logs in here.'}
          </p>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Email</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Full Name</label>
            <input
              type="text"
              value={inviteForm.fullName}
              onChange={e => setInviteForm({ ...inviteForm, fullName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Role</label>
            <select
              value={inviteForm.role}
              onChange={e => setInviteForm({ ...inviteForm, role: e.target.value as User['role'] })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="chief_minister">Chief Minister</option>
              <option value="secretary">Secretary</option>
              <option value="finance_minister">Finance Minister</option>
              <option value="member">Member</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleInviteUser} isLoading={isInviting}>
              {isInviting ? 'Sending...' : 'Send Invite'}
            </Button>
            <Button onClick={() => setInviteModalOpen(false)} variant="secondary" disabled={isInviting}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function tabLabel(tab: string) {
  const map: Record<string, string> = {
    dashboard: 'Dashboard',
    documents: 'Documents',
    archive: 'Archive',
    administrations: 'Administrations',
    users: 'Users',
    logs: 'Activity Logs',
  }
  return map[tab] ?? 'Dashboard'
}

function buildUploadsOverTime(documents: Document[]): { name: string; value: number }[] {
  const result: { name: string; value: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const year = d.getFullYear()
    const month = d.getMonth()
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
    const count = documents.filter(doc => {
      const u = new Date(doc.uploadDate)
      return u.getFullYear() === year && u.getMonth() === month
    }).length
    result.push({ name: label, value: count })
  }
  return result
}