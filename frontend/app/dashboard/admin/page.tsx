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
import { useAdministrationStore } from '@/lib/stores/administrationStore'
import { useCategoryStore } from '@/lib/stores/categoryStore'
import { useEventStore } from '@/lib/stores/eventStore'
import RecycleBin from '@/components/dashboard/RecycleBin'
import { FileText, Archive, Upload, Users, Download, ChevronDown, FileCheck, CalendarClock, ArrowRight, Mail } from 'lucide-react'
import { Document, User } from '@/types'
import { apiGetDashboardStats, DashboardStats } from '@/lib/api'
import { mockCategories } from '@/lib/mockData'
import { toast } from '@/lib/stores/toastStore'
import { confirmDialog } from '@/lib/stores/confirmStore'
import FolderExplorer from '@/components/dashboard/FolderExplorer'
import LogsTabContent from '@/components/dashboard/LogsTabContent'
import UsersTabContent from '@/components/dashboard/UsersTabContent'
import { useFolderStore } from '@/lib/stores/folderStore'
import FileTypeIcon from '@/components/ui/FileTypeIcon'
import Reveal from '@/components/ui/Reveal'
import Input from '@/components/ui/Input'

const TABS = [
  { name: 'Dashboard', href: '/dashboard/admin' },
  { name: 'Documents', href: '/dashboard/admin?tab=documents' },
  { name: 'Archive', href: '/dashboard/admin?tab=archive' },
  { name: 'Recycle Bin', href: '/dashboard/admin?tab=trash' },
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
    trashedDocuments,
    loading: documentsLoading,
    fetchDocuments,
    fetchTrash,
    addDocument,
    updateDocument,
    deleteDocument,
    trashDocument,
    restoreDocument,
    permanentDeleteDocument,
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
    fetchTrash()
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

  // Dashboard derived values
  const trend = (stats?.uploadsOverTime ?? []).slice(-6).map(d => d.value)
  const recentDelta = trend.length >= 2 ? trend[trend.length - 1] - trend[trend.length - 2] : undefined
  const recentDocs = stats?.recentDocuments ?? activeDocs.slice(0, 5).map(d => ({
    id: d.id,
    title: d.title,
    category: d.category,
    uploadDate: d.uploadDate,
    uploaderName: uploaderNames[d.uploadedBy] ?? 'Unknown',
  }))

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleUpload = async (data: { title: string; category: string; event: string; administration: string; folderId?: string | null }, file?: File | null) => {
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

  const handleTrash = async (doc: Document) => {
    const ok = await confirmDialog({
      title: 'Move to recycle bin?',
      message: `"${doc.title}" will be moved to the recycle bin. You can restore it within 30 days.`,
      confirmLabel: 'Move to bin',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await trashDocument(doc.id)
      toast.success('Moved to recycle bin')
    } catch (e: any) {
      toast.error('Failed: ' + e.message)
    }
  }

  const handleRestore = async (doc: Document) => {
    try {
      await restoreDocument(doc.id)
      toast.success('Document restored')
    } catch (e: any) {
      toast.error('Restore failed: ' + e.message)
    }
  }

  const handlePermanentDelete = async (doc: Document) => {
    const ok = await confirmDialog({
      title: 'Permanently delete?',
      message: `"${doc.title}" will be gone forever. This cannot be undone.`,
      confirmLabel: 'Delete forever',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await permanentDeleteDocument(doc.id)
      toast.success('Permanently deleted')
    } catch (e: any) {
      toast.error('Delete failed: ' + e.message)
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
    <DashboardLayout
      tabs={TABS}
      activeTab={tabLabel(tab)}
      onNewUpload={tab === 'documents' ? () => {
        setUploadPrefill(null)
        setTargetFolderId(null)
        setUploadModalOpen(true)
      } : undefined}
    >
      {/* ── DASHBOARD TAB ─────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div>
          {/* ─── Hero (near full-viewport, dark gray brand) ─── */}
          <section
            className="relative px-4 sm:px-6 lg:px-10 flex flex-col bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#0d0d0d] text-white overflow-hidden"
            style={{ minHeight: 'calc(100vh - 3.5rem)' }}
          >
            {/* Subtle dot grid */}
            <div
              className="absolute inset-0 opacity-[0.07] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
              aria-hidden="true"
            />
            {/* Soft accent orbs */}
            <div
              className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-white/[0.04] blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-40 -left-32 h-[32rem] w-[32rem] rounded-full bg-white/[0.03] blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            {/* Watermark file icon */}
            <div
              className="absolute right-[-80px] top-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none hidden lg:block"
              aria-hidden="true"
            >
              <FileText size={520} strokeWidth={1} />
            </div>

            {/* Centered content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto py-16">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] ring-1 ring-white/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-200 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Official MSU BYTES Platform
              </span>

              <h1 className="mt-6 text-5xl sm:text-7xl md:text-8xl font-extrabold uppercase tracking-tighter leading-[0.9]">
                Welcome,
                <br />
                <span className="bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
                  {user.fullName.split(' ')[0]}
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base sm:text-lg text-gray-300 leading-relaxed">
                BytesDoc is the central archive for the BYTES Student Council — catalog,
                organize, and securely store executive files across Finance, Secretary,
                and Elections.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/admin?tab=documents')}
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-primary shadow-elevated hover:bg-gray-100 active:scale-[0.98] transition"
                >
                  Browse Folders
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/admin?tab=users')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] ring-1 ring-white/15 px-7 py-3 text-sm font-semibold text-white active:scale-[0.98] transition backdrop-blur-sm"
                >
                  <Users size={16} />
                  Manage Users
                </button>
              </div>
            </div>

            {/* Scroll indicator */}
            <a
              href="#stats"
              className="relative z-10 mx-auto mb-10 flex flex-col items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400 hover:text-white transition"
            >
              <span>Scroll for stats</span>
              <ChevronDown size={18} className="animate-bounce" />
            </a>
          </section>

          <div className="px-6 pt-12 pb-10 space-y-12">
          {/* ─── KPI strip (scroll-reveal with stagger) ─── */}
          <div id="stats" className="scroll-mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Reveal delay={0}>
              <Card
                title="Total Documents"
                value={stats?.totalDocuments ?? documents.length}
                icon={<FileText size={22} />}
                accent="slate"
              />
            </Reveal>
            <Reveal delay={80}>
              <Card
                title="Active Documents"
                value={stats?.activeDocuments ?? activeDocs.length}
                icon={<FileCheck size={22} />}
                accent="slate"
              />
            </Reveal>
            <Reveal delay={160}>
              <Card
                title="Archived Documents"
                value={stats?.archivedDocuments ?? archivedDocs.length}
                icon={<Archive size={22} />}
                accent="slate"
              />
            </Reveal>
            <Reveal delay={240}>
              <Card
                title="Recent Uploads (7d)"
                value={stats?.recentUploads ?? 0}
                icon={<Upload size={22} />}
                accent="slate"
                sparkline={trend.length > 1 ? trend : undefined}
                delta={recentDelta}
                deltaLabel="vs prior period"
              />
            </Reveal>
          </div>

          {/* ─── Charts (scroll-reveal) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Reveal delay={0}>
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
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] px-2 py-1 rounded-full">
                    <FileText size={11} /> All time
                  </span>
                </div>
                <BarChart data={stats?.docsPerCategory ?? []} />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Trend
                    </div>
                    <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
                      Uploads over time
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] px-2 py-1 rounded-full">
                    <CalendarClock size={11} /> Last 6 months
                  </span>
                </div>
                <LineChart data={stats?.uploadsOverTime ?? []} />
              </div>
            </Reveal>
          </div>

          {/* ─── Recent documents (scroll-reveal) ─── */}
          <Reveal>
            <div className="bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Recent documents</h2>
                <button
                  onClick={() => router.push('/dashboard/admin?tab=documents')}
                  className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  View all →
                </button>
              </div>
              {recentDocs.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No documents uploaded yet.
                </p>
              ) : (
                <ul className="divide-y divide-border-subtle dark:divide-white/5">
                  {recentDocs.map(d => {
                    const doc = documents.find(x => x.id === d.id)
                    return (
                      <li
                        key={d.id}
                        className="group flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.025] transition-colors"
                      >
                        <FileTypeIcon fileType={doc?.fileType ?? 'pdf'} size={22} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[13px] text-gray-900 dark:text-white">{d.title}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {d.category} · {d.uploaderName} · {new Date(d.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => doc && handleDownload(doc)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 opacity-60 group-hover:opacity-100 transition"
                          title="Download"
                          aria-label={`Download ${d.title}`}
                        >
                          <Download size={16} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </Reveal>
          </div>
        </div>
      )}

      {/* ── DOCUMENTS TAB ─────────────────────────────────────── */}
      {tab === 'documents' && (
        <div className="px-6 pt-5 pb-8">
          <FolderExplorer
            documents={documents}
            users={users}
            role={user.role}
            onView={handleView}
            onDownload={handleDownload}
            onEdit={handleEditOpen}
            onDelete={handleTrash}
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

      {tab === 'trash' && (
        <div className="px-6 pt-5 pb-8">
          <RecycleBin
            documents={trashedDocuments}
            uploaderNames={uploaderNames}
            canPermanentDelete={true}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
          />
        </div>
      )}

      {/* ── ARCHIVE TAB ──────────────────────────────────────── */}
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

      {/* ── USERS TAB ─────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="px-6 pt-5 pb-8">
          <UsersTabContent users={users} onInvite={() => setInviteModalOpen(true)} />
        </div>
      )}

      {/* ── ACTIVITY LOGS TAB ────────────────────────────────── */}
      {tab === 'logs' && (
        <div className="px-6 pt-5 pb-8">
          <LogsTabContent
            logs={displayLogs}
            users={users}
            documents={documents}
            filterUser={filterUser}
            filterAction={filterAction}
            onFilterUserChange={setFilterUser}
            onFilterActionChange={setFilterAction}
            onExport={handleExportLogs}
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
        role={user.role}
        allowedCategories={categories.map(c => c.name)}
        prefill={uploadPrefill ? { ...uploadPrefill, folderId: targetFolderId } : null}
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
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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
              {events.map(ev => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
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
              {administrations.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Invite User Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        eyebrow="Membership"
        title="Invite a new member"
        width={500}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteModalOpen(false)} disabled={isInviting}>
              Cancel
            </Button>
            <Button variant="primary" icon={Users} onClick={handleInviteUser} isLoading={isInviting}>
              {isInviting ? 'Sending…' : 'Send invite'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[12px] text-gray-500 dark:text-gray-400">
            {usingMock
              ? 'Demo mode: this adds the user to local state only. No email is sent.'
              : 'An invite email will be sent to this address. The recipient sets their password from the link, then logs in here.'}
          </p>
          <Input
            type="email"
            label="Email"
            icon={Mail}
            value={inviteForm.email}
            onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
            placeholder="member@msu.in"
          />
          <Input
            label="Full name"
            value={inviteForm.fullName}
            onChange={e => setInviteForm({ ...inviteForm, fullName: e.target.value })}
            placeholder="Juan dela Cruz"
          />
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Role
            </span>
            <select
              value={inviteForm.role}
              onChange={e => setInviteForm({ ...inviteForm, role: e.target.value as User['role'] })}
              className="w-full text-[13px] px-3 py-2 rounded-lg ring-1 ring-border-subtle dark:ring-white/10 bg-white dark:bg-white/[0.02] text-gray-900 dark:text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:focus-visible:ring-white/40 transition-shadow"
            >
              <option value="chief_minister">Chief Minister</option>
              <option value="secretary">Secretary</option>
              <option value="finance_minister">Finance Minister</option>
              <option value="member">Member</option>
            </select>
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
    trash: 'Recycle Bin',
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