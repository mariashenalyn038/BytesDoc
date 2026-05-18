import Link from 'next/link'
import Image from 'next/image'
import { FileText, Lock, Archive, Activity, ArrowRight, Github, Mail } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans text-white">
      {/* Photo background + readability overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/graybg1.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/55 to-black/80" />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top nav */}
        <header className="w-full">
          <div className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-center gap-2.5">
              <Image
                src="/byteslogo1.png"
                alt="BYTES Student Council"
                width={36}
                height={36}
                priority
                className="rounded-sm"
              />
              <span className="text-base font-bold uppercase tracking-tighter">BytesDoc</span>
            </div>
          </div>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col items-center justify-center px-5 sm:px-8 pt-6 pb-16">
          <div className="w-full max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white ring-1 ring-white/20 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                BYTES Student Council
              </div>

              <h1 className="text-5xl font-bold uppercase leading-[0.95] tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl">
                BytesDoc
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-base text-gray-200 sm:text-lg md:text-xl">
                Centralized document management for the council — role-based access, audit logs, and archiving in one place.
              </p>

              <div className="mt-8 flex justify-center">
                <Link
                  href="/login"
                  className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-10 py-3 text-base font-semibold text-primary shadow-elevated hover:bg-gray-100 active:scale-[0.98] transition"
                >
                  Login
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* Feature grid */}
            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl bg-primary/80 p-5 ring-1 ring-white/10 backdrop-blur-md shadow-elevated hover:bg-accent/85 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 group-hover:bg-white/20 transition-colors">
                    <f.icon className="h-5 w-5 text-gray-100" />
                  </div>
                  <h3 className="text-base font-bold tracking-tight">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-300">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-black/30 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 sm:flex-row sm:px-8">
            <p className="text-xs text-white/70">
              &copy; 2024 BYTES Student Council. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-white/70">
              <a href="mailto:info@bytes.com" className="inline-flex items-center gap-1.5 hover:text-white transition">
                <Mail size={12} />
                info@bytes.com
              </a>
              <a
                href="https://github.com/0-0april/BytesDoc"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-white transition"
              >
                <Github size={12} />
                Source
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

const features = [
  { icon: FileText, title: 'Secure Upload', body: 'PDF and DOCX uploads with a 10 MB cap and role-based visibility.' },
  { icon: Lock, title: 'Role-Based Access', body: 'Chief Minister, Secretary, Finance, and Members each see what they should.' },
  { icon: Archive, title: 'Document Archiving', body: 'Archive past administrations into a read-only history.' },
  { icon: Activity, title: 'Activity Logs', body: 'Every login, upload, view, and download recorded for the audit trail.' },
]
