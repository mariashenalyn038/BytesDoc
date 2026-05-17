import Link from 'next/link'
import { FileText, Lock, Archive, Activity, ArrowRight, Github } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary via-accent to-primary dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative container mx-auto px-4 py-20">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm text-white/90 ring-1 ring-white/20 mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            BYTES Student Council
          </div>
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 tracking-tight">
            BytesDoc
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
            Centralized document management with role-based access, audit logs, and archiving — built for the council.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 bg-white text-primary px-7 py-3 rounded-lg font-semibold shadow-elevated hover:bg-gray-100 transition"
            >
              Login
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://github.com/0-0april/BytesDoc"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-white/10 text-white px-7 py-3 rounded-lg font-semibold ring-1 ring-white/20 backdrop-blur-sm hover:bg-white/20 transition"
            >
              <Github size={18} />
              View on GitHub
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map(f => (
            <div
              key={f.title}
              className="group bg-white/10 backdrop-blur-sm p-6 rounded-xl text-white ring-1 ring-white/15 hover:bg-white/15 hover:ring-white/30 transition"
            >
              <div className="inline-flex items-center justify-center rounded-lg bg-white/15 p-3 mb-4 ring-1 ring-white/20">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-200/90 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        <footer className="mt-24 flex flex-col items-center gap-2 text-sm text-white/70">
          <p>Contact: info@bytes.com</p>
          <p>&copy; 2024 BYTES Student Council. All rights reserved.</p>
          <a
            href="https://github.com/0-0april/BytesDoc"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-white transition"
          >
            <Github size={14} />
            Source code
          </a>
        </footer>
      </div>
    </div>
  )
}

const features = [
  { icon: FileText, title: 'Secure Upload', body: 'Upload PDFs and DOCX with role-based visibility and 10 MB cap.' },
  { icon: Lock, title: 'Role-Based Access', body: 'Chief Minister, Secretary, Finance, and Members each see what they should.' },
  { icon: Archive, title: 'Document Archiving', body: 'Archive past administrations into a read-only history.' },
  { icon: Activity, title: 'Activity Logs', body: 'Every login, upload, view, and download recorded for the audit trail.' },
]
