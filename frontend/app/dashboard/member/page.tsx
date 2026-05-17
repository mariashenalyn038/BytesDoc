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
import BarChart from '@/components/charts/BarChart'
import DocumentTable from '@/components/dashboard/DocumentTable'
import ArchiveList from '@/components/dashboard/ArchiveList'
import DocumentViewerModal from '@/components/dashboard/DocumentViewerModal'
import { FileText, Archive } from 'lucide-react'
import { Document } from '@/types'
import { mockCategories } from '@/lib/mockData'
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

  const [searchTerm, setSearchTerm] = useState('')
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

  const filteredDocs = documents.filter(d => {
    if (tab === 'documents') {
      const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase())
      return !d.is_archived && matchesSearch
    }
    return d.is_archived
  })

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
  const recentDocs = documents.filter(d => !d.is_archived).slice(0, 5)

  const categoryData = mockCategories.map(c => ({
    name: c,
    value: documents.filter(d => d.category === c && !d.is_archived).length,
  }))

  return (
    <DashboardLayout tabs={tabs} activeTab={tab === 'documents' ? 'Documents' : tab === 'archive' ? 'Archive' : 'Dashboard'}>
      {tab === 'dashboard' && (
        <div className="space-y-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Member Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Accessible Documents" value={totalDocs} icon={<FileText size={32} />} />
            <Card title="Archived Documents" value={archivedDocs} icon={<Archive size={32} />} />
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Documents by Category</h2>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documents (View Only)</h1>

          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />

          <DocumentTable
            documents={filteredDocs}
            canUpload={false}
            canEdit={() => false}
            canDelete={() => false}
            canArchive={false}
            onView={handleView}
            onDownload={handleDownload}
            uploaderNames={uploaderNames}
          />
        </div>
      )}

      {tab === 'archive' && (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Archive (View Only)</h1>
          <ArchiveList
            documents={filteredDocs}
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
      />
    </DashboardLayout>
  )
}
