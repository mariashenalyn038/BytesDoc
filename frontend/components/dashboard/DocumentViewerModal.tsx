'use client'

import { useEffect, useState } from 'react'
import { Download, ExternalLink, FileText } from 'lucide-react'
import { Document } from '@/types'
import { apiDownloadDocument } from '@/lib/api'
import { toast } from '@/lib/stores/toastStore'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { fileTypeMeta } from '@/components/ui/FileTypeIcon'

interface DocumentViewerModalProps {
  isOpen: boolean
  onClose: () => void
  document: Document | null
  uploaderName?: string
  onEdit?: (doc: Document) => void
  onRename?: (doc: Document) => void
  onDelete?: (doc: Document) => void
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function DocumentViewerModal({
  isOpen,
  onClose,
  document: doc,
  uploaderName,
}: DocumentViewerModalProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)

  useEffect(() => {
    if (!isOpen || !doc) {
      setUrl(null); setDocxHtml(null); setError(null); return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    apiDownloadDocument(doc.id)
      .then(res => { if (!cancelled) setUrl(res.url) })
      .catch((e: any) => { if (!cancelled) setError(e?.message ?? 'Failed to load preview') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isOpen, doc?.id])

  useEffect(() => {
    if (!url || !doc || doc.fileType !== 'docx') return
    let cancelled = false
    setExtracting(true)
    ;(async () => {
      try {
        const mammoth: any = await import('mammoth/mammoth.browser')
        const buf = await fetch(url).then(r => r.arrayBuffer())
        if (cancelled) return
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf })
        if (!cancelled) setDocxHtml(html)
      } catch {
        if (!cancelled) setDocxHtml(null)
      } finally {
        if (!cancelled) setExtracting(false)
      }
    })()
    return () => { cancelled = true }
  }, [url, doc?.id, doc?.fileType])

  if (!isOpen || !doc) return null

  const fileLabel = fileTypeMeta(doc.fileType).label
  const fileTypeUpper = doc.fileType.toUpperCase()
  const openFullScreen = () => {
    if (!url) { toast.info('Preview is still loading, please wait a moment.'); return }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Document viewer"
      title={doc.title}
      width={820}
      footer={
        <>
          <span className="mr-auto text-[11px] text-gray-500 dark:text-gray-400">
            Uploaded by {uploaderName ?? doc.uploadedBy} · {relativeTime(doc.uploadDate)}
          </span>
          <Button variant="outline" icon={Download} onClick={openFullScreen}>
            Download
          </Button>
          <Button variant="primary" icon={ExternalLink} onClick={openFullScreen}>
            Open full screen
          </Button>
        </>
      }
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Left column: versions + metadata */}
        <div className="w-full sm:w-44 sm:shrink-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
            Versions
          </div>
          <div className="space-y-1.5">
            <button
              className="w-full flex items-center justify-between text-left rounded-lg px-2.5 py-1.5 text-[12px] bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-white font-semibold"
            >
              <span>Current</span>
              <span className="text-[10px] opacity-60">{relativeTime(doc.uploadDate)}</span>
            </button>
          </div>

          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mt-5 mb-2">
            Metadata
          </div>
          <dl className="text-[11px] space-y-1.5">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-gray-400">Type</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{fileTypeUpper}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-gray-400">Category</dt>
              <dd className="font-medium text-gray-900 dark:text-white truncate text-right">{doc.category}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-gray-400">Event</dt>
              <dd className="font-medium text-gray-900 dark:text-white truncate text-right">{doc.event}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-gray-400">Admin</dt>
              <dd className="font-medium text-gray-900 dark:text-white truncate text-right">{doc.administration}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {doc.is_archived ? 'Archived' : 'Active'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Right column: paper preview */}
        <div className="flex-1 rounded-lg ring-1 ring-border-subtle dark:ring-white/10 bg-gray-100 dark:bg-black/40 p-3 h-[360px] overflow-hidden">
          <div className="bg-white rounded-sm shadow ring-1 ring-black/[0.06] h-full overflow-hidden relative">
            {loading && (
              <div className="h-full grid place-items-center text-sm text-gray-500">
                Loading preview…
              </div>
            )}
            {error && !loading && (
              <div className="h-full grid place-items-center text-center px-6">
                <div className="text-sm text-red-600">Failed to load preview</div>
              </div>
            )}
            {url && !loading && !error && doc.fileType === 'pdf' && (
              <iframe
                src={url}
                title={doc.title}
                className="w-full h-full border-0 bg-white"
              />
            )}
            {url && !loading && !error && doc.fileType === 'docx' && (
              <div className="h-full overflow-y-auto px-8 py-6 text-gray-900">
                <div className="text-[10px] uppercase tracking-widest text-gray-400">BYTES Student Council</div>
                <div className="text-base font-bold tracking-tight text-gray-900 mt-1">{doc.title}</div>
                <div className="text-[11px] text-gray-500 mb-3">
                  {doc.event} · {new Date(doc.uploadDate).toLocaleDateString()}
                </div>
                {extracting && !docxHtml && (
                  <div className="text-[12px] text-gray-500">Rendering document…</div>
                )}
                {docxHtml && (
                  <div
                    className="docx-preview text-[12px] leading-relaxed text-gray-800"
                    style={{ fontFamily: 'Calibri, Helvetica, Arial, sans-serif' }}
                    dangerouslySetInnerHTML={{ __html: docxHtml }}
                  />
                )}
                {!extracting && !docxHtml && (
                  <div className="mt-4 text-[12px] text-gray-500 flex items-center gap-2">
                    <FileText size={14} />
                    Inline preview unavailable. Use “Open full screen” to view.
                  </div>
                )}
              </div>
            )}
            <div className="absolute bottom-3 right-4 text-[10px] text-gray-400 font-mono pointer-events-none">
              {fileLabel}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
