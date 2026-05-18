import Link from 'next/link'
import Image from 'next/image'
import { FileText, Lock, Archive, Activity, Github } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-6 md:p-12 font-sans">
      {/* Photo background + readability overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/graybg1.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/55" />
      </div>

      {/* Oversized decorative logo, left */}
      <div className="absolute -left-32 md:-left-60 lg:-left-80 top-1/2 -translate-y-1/2 w-[80%] md:w-[65%] lg:w-[55%] opacity-90 pointer-events-none select-none z-10">
        <Image
          src="/byteslogo1.png"
          alt=""
          width={1200}
          height={1200}
          priority
          className="w-full h-auto drop-shadow-2xl"
        />
      </div>

      {/* Right-aligned hero + grid */}
      <div className="relative z-20 w-full max-w-7xl flex flex-col items-end">
        <div className="text-right mb-12 lg:mb-20 pr-4 md:pr-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-primary ring-1 ring-black/10 mb-4 uppercase tracking-widest shadow-soft">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            BYTES Student Council
          </div>
          <h1 className="text-6xl md:text-8xl font-bold text-primary tracking-tight uppercase leading-none drop-shadow-sm">
            BytesDoc
          </h1>
          <p className="text-lg md:text-2xl text-[#1f1f1f] mt-4 font-medium max-w-md ml-auto">
            Centralized document management for the council — role-based access, audit logs, and archiving.
          </p>
          <Link
            href="/login"
            className="inline-block mt-8 bg-primary text-white px-14 py-4 rounded-xl text-lg font-bold hover:bg-accent transition-all shadow-elevated active:scale-95"
          >
            LOGIN
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-primary/85 backdrop-blur-md p-8 rounded-2xl text-white ring-1 ring-white/10 shadow-elevated hover:bg-accent/85 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center gap-3 border-b border-white/15 pb-3 mb-3">
                <f.icon className="w-5 h-5 text-gray-300" />
                <h3 className="text-lg font-bold">{f.title}</h3>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        <footer className="mt-10 flex items-center gap-4 text-xs text-white/85">
          <span>&copy; 2024 BYTES Student Council</span>
          <a
            href="https://github.com/0-0april/BytesDoc"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-white transition"
          >
            <Github size={12} />
            Source
          </a>
        </footer>
      </div>
    </div>
  )
}

const features = [
  { icon: FileText, title: 'Secure Upload', body: 'Upload PDFs and DOCX with role-based visibility and a 10 MB cap.' },
  { icon: Lock, title: 'Role-Based Access', body: 'Chief Minister, Secretary, Finance, and Members each see what they should.' },
  { icon: Archive, title: 'Document Archiving', body: 'Archive past administrations into a read-only history.' },
  { icon: Activity, title: 'Activity Logs', body: 'Every login, upload, view, and download recorded for the audit trail.' },
]
