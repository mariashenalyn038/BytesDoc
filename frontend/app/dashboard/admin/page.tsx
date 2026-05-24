'use client'

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
import LineChart from '@/components/charts/LineChart'
import DocumentTable from '@/components/dashboard/DocumentTable'
import ArchiveList from '@/components/dashboard/ArchiveList'
import DocumentViewerModal from '@/components/dashboard/DocumentViewerModal'
import UploadModal from '@/components/dashboard/UploadModal'
import UserTable from '@/components/dashboard/UserTable'
import ActivityLogTable from '@/components/dashboard/ActivityLogTable'
import DocumentSettingsPanel from '@/components/dashboard/DocumentSettingsPanel'
import { FileTypeBadge } from '@/components/ui/FileTypeIcon'
import { useAdministrationStore } from '@/lib/stores/administrationStore'
import { useCategoryStore } from '@/lib/stores/categoryStore'
import { useEventStore } from '@/lib/stores/eventStore'
import { FileText, Archive, Upload, Users, Activity, Download, ChevronDown } from 'lucide-react'
import { Document, User } from '@/types'
import { apiGetDashboardStats, DashboardStats } from '@/lib/api'
import { mockCategories } from '@/lib/mockData'
import { toast } from '@/lib/stores/toastStore'
import { confirmDialog } from '@/lib/stores/confirmStore'
import FolderExplorer from '@/components/dashboard/FolderExplorer'
import { useFolderStore } from '@/lib/stores/folderStore'

const TABS = [
  { name: 'Dashboard', href: '/dashboard/admin' },
  { name: 'Documents', href: '/dashboard/admin?tab=documents' },
  { name: 'Archive', href: '/dashboard/admin?tab=archive' },
  { name: 'Document Settings', href: '/dashboard/admin?tab=settings' },
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
    loading: documentsLoading,
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
  const { categories, ensureLoaded: ensureCategoriesLoaded } = useCategoryStore()
  const { events, ensureLoaded: ensureEventsLoaded } = useEventStore()

  const assignDocumentToFolder = useFolderStore(s => s.assignDocumentToFolder)

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

  // Welcome Intro states
  const [showSummary, setShowSummary] = useState(false)
  const [uploadPrefill, setUploadPrefill] = useState<{ category: string; administration: string; event?: string } | null>(null)
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null)

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
    ensureCategoriesLoaded()
    ensureEventsLoaded()
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
      const doc = await addDocument(file ?? null, { ...data, fileType: file?.name.endsWith('.docx') ? 'docx' : 'pdf' }, {
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
      if (targetFolderId && doc?.id) {
        assignDocumentToFolder(doc.id, targetFolderId)
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
          {/* Welcome Intro Section */}
          <div className="bg-gradient-to-r from-[#0A2647] to-[#1E3A5F] text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-1/4 translate-x-1/4">
              <FileText size={350} />
            </div>
            <div className="max-w-2xl relative z-10 space-y-4">
              <span className="bg-blue-500/25 text-blue-200 border border-blue-400/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                Official MSU BYTES Platform
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Welcome to BytesDoc
              </h1>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                BytesDoc serves as the central student council archive. It is designed to catalog, organize,
                and securely store executive files across diverse categories like Finance, Secretary, and Elections, ensuring perfect administrative continuity.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={() => router.push('/dashboard/admin?tab=documents')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium border-0 px-6"
                >
                  Browse Folders
                </Button>
                <Button
                  onClick={() => setShowSummary(!showSummary)}
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-medium px-6"
                >
                  {showSummary ? 'Hide Statistics' : 'View Statistics'}
                </Button>
              </div>
            </div>
          </div>

          {/* Slide Down stats trigger */}
          {!showSummary && (
            <div
              className="flex flex-col items-center justify-center pt-4 animate-bounce cursor-pointer group"
              onClick={() => setShowSummary(true)}
            >
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-primary transition">
                Slide down or click to view statistics
              </span>
              <ChevronDown size={20} className="text-gray-400 group-hover:text-primary mt-1 transition" />
            </div>
          )}

          {/* Summary section (smoothly toggled) */}
          {showSummary && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50 pb-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">System Summary Stats</h2>
                <button
                  onClick={() => setShowSummary(false)}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 transition"
                >
                  Hide Stats ▲
                </button>
              </div>

              {(() => {
                const trend = (stats?.uploadsOverTime ?? []).slice(-6).map(d => d.value)
                const recentDelta = trend.length >= 2 ? trend[trend.length - 1] - trend[trend.length - 2] : undefined
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card title="Total Documents" value={stats?.totalDocuments ?? documents.length} icon={<FileText size={28} />} />
                    <Card title="Active Documents" value={stats?.activeDocuments ?? activeDocs.length} icon={<FileText size={28} />} />
                    <Card title="Archived Documents" value={stats?.archivedDocuments ?? archivedDocs.length} icon={<Archive size={28} />} />
                    <Card
                      title="Recent Uploads (7d)"
                      value={stats?.recentUploads ?? 0}
                      icon={<Upload size={28} />}
                      sparkline={trend.length > 1 ? trend : undefined}
                      delta={recentDelta}
                      deltaLabel="vs prior period"
                    />
                  </div>
                )
              })()}

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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Documents</h2>
                  <button
                    onClick={() => router.push('/dashboard/admin?tab=documents')}
                    className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                  >
                    View all →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-subtle dark:border-white/5 bg-gray-50/80 dark:bg-gray-900/40">
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Title</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Uploader</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Action</th>
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
                              <FileTypeBadge fileType={documents.find(doc => doc.id === d.id)?.fileType ?? 'pdf'} />
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
        </div>
      )}

      {/* ── DOCUMENTS TAB ─────────────────────────────────────── */}
      {tab === 'documents' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Documents Explorer</h1>
            <Button
              onClick={() => {
                setUploadPrefill(null)
                setTargetFolderId(null)
                setUploadModalOpen(true)
              }}
            >
              <Upload size={20} className="inline mr-2" />
              Upload Document
            </Button>
          </div>

          <FolderExplorer
            documents={documents}
            role={user.role}
            onView={handleView}
            onDownload={handleDownload}
            onEdit={handleEditOpen}
            onDelete={handleDelete}
            onArchive={handleArchive}
            uploaderNames={uploaderNames}
            onUploadRequested={(prefill, folderId) => {
              setUploadPrefill(prefill)
              setTargetFolderId(folderId)
              setUploadModalOpen(true)
            }}
          />
        </div>
      )}

      {/* ── ARCHIVE TAB ──────────────────────────────────────── */}
      {tab === 'archive' && (
        <div className="space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Archive Explorer</h1>
          <FolderExplorer
            documents={documents}
            role={user.role}
            isArchive={true}
            onView={handleView}
            onDownload={handleDownload}
            uploaderNames={uploaderNames}
          />
        </div>
      )}

      {/* ── DOCUMENT SETTINGS TAB ────────────────────────────── */}
      {tab === 'settings' && <DocumentSettingsPanel />}

      {/* ── USERS TAB ─────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>
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
        onClose={() => {
          setUploadModalOpen(false)
          setUploadPrefill(null)
          setTargetFolderId(null)
        }}
        onUpload={handleUpload}
        allowedCategories={categories.map(c => c.name)}
        prefill={uploadPrefill}
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
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Event</label>
            <select
              value={editForm.event}
              onChange={e => setEditForm({ ...editForm, event: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              {events.map(ev => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
            </select>
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
    settings: 'Document Settings',
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