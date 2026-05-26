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
import Eyebrow from '@/components/ui/Eyebrow'
import BarChart from '@/components/charts/BarChart'
import FolderExplorer from '@/components/dashboard/FolderExplorer'
import DocumentViewerModal from '@/components/dashboard/DocumentViewerModal'
import { FileTypeTile } from '@/components/ui/FileTypeIcon'
import { FileText, Archive, Activity } from 'lucide-react'
import { Document } from '@/types'
import { useCategoryStore } from '@/lib/stores/categoryStore'
import { toast } from '@/lib/stores/toastStore'

export default function MemberDashboard() {
  return (
    <Suspense fallback={null}>
      <MemberDashboardContent />
    </Suspense>
  )
}

function MemberDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'

  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const { documents } = useDocumentStore()
  const { users } = useUserStore()
  const { addLog } = useActivityStore()
  const { categories, ensureLoaded: ensureCategoriesLoaded } = useCategoryStore()

  useEffect(() => { ensureCategoriesLoaded() }, [ensureCategoriesLoaded])

  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated || user?.role !== 'member') {
      router.push('/login')
    }
  }, [hasHydrated, isAuthenticated, user, router])

  if (!user) return null

  const tabs = [
    { name: 'Dashboard', href: '/dashboard/member' },
    { name: 'Documents', href: '/dashboard/member?tab=documents' },
    { name: 'Archive', href: '/dashboard/member?tab=archive' },
  ]

  const uploaderNames = users.reduce((acc, u) => {
    acc[u.id] = u.fullName
    return acc
  }, {} as Record<string, string>)

  const handleView = (doc: Document) => {
    setSelectedDoc(doc)
    setViewModalOpen(true)
    addLog({ userId: user.id, action: 'view', documentId: doc.id })
  }

  const handleDownload = (doc: Document) => {
    addLog({ userId: user.id, action: 'download', documentId: doc.id })
    toast.info('Download started: ' + doc.title)
  }

  const totalDocs = documents.filter(d => !d.is_archived).length
  const archivedDocs = documents.filter(d => d.is_archived).length
  const recentDocs = [...documents]
    .filter(d => !d.is_archived)
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .slice(0, 5)

  const categoryData = categories.map(c => ({
    name: c.name,
    value: documents.filter(d => d.category === c.name && !d.is_archived).length,
  }))

  return (
    <DashboardLayout tabs={tabs} activeTab={tab === 'documents' ? 'Documents' : tab === 'archive' ? 'Archive' : 'Dashboard'}>
      {tab === 'dashboard' && (
        <div className="px-6 pt-5 pb-8 space-y-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Member
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
              Welcome back, {user.fullName.split(' ')[0]}
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
              Browse the council archive and access shared documents.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card title="Accessible documents" value={totalDocs} icon={<FileText size={22} />} accent="blue" />
            <Card title="Archived documents" value={archivedDocs} icon={<Archive size={22} />} accent="amber" />
          </div>

          <div className="bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Distribution
                </div>
                <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
                  Documents by category
                </h2>
              </div>
              <Eyebrow><Activity size={11} /> All time</Eyebrow>
            </div>
            <BarChart data={categoryData} />
          </div>

          <div className="bg-white dark:bg-white/[0.02] ring-1 ring-border-subtle dark:ring-white/5 shadow-soft rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Recent documents</h2>
              <button
                onClick={() => router.push('/dashboard/member?tab=documents')}
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
            uploaderNames={uploaderNames}
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

      <DocumentViewerModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        document={selectedDoc}
        uploaderName={selectedDoc ? uploaderNames[selectedDoc.uploadedBy] : undefined}
      />
    </DashboardLayout>
  )
}
