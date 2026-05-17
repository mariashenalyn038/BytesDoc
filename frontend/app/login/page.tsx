'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Archive,
  Activity,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/lib/stores/authStore'
import { useActivityStore } from '@/lib/stores/activityStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const addLog = useActivityStore((state) => state.addLog)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const success = await login(email, password)

      if (success) {
        const user = useAuthStore.getState().user
        if (user) {
          addLog({ userId: user.id, action: 'login' })

          const roleRoutes = {
            chief_minister: '/dashboard/admin',
            secretary: '/dashboard/secretary',
            finance_minister: '/dashboard/finance',
            member: '/dashboard/member',
          }
          router.push(roleRoutes[user.role])
        }
      } else {
        setError('Invalid email or password')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const features = [
    { icon: ShieldCheck, label: 'Role-based access', desc: 'Permissions scoped to council role.' },
    { icon: Archive, label: 'Archive workflow', desc: 'Retire stale documents without losing them.' },
    { icon: Activity, label: 'Full audit trail', desc: 'Every action logged and traceable.' },
  ]

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-surface dark:bg-surface-dark">
      <aside className="relative hidden md:flex flex-col justify-between bg-[#1a1a1a] text-white p-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-white/[0.03] blur-3xl" />

        <div className="relative flex items-center gap-3">
          <Image
            src="/byteslogo1.png"
            alt="MSU BYTES"
            width={44}
            height={44}
            className="rounded-sm"
          />
          <span className="text-xl font-bold uppercase tracking-tighter">BytesDoc</span>
        </div>

        <div className="relative space-y-8 max-w-sm">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-xs font-medium text-gray-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              BYTES Student Council
            </span>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Document control,
              <br />
              built for the council.
            </h2>
            <p className="text-sm leading-relaxed text-gray-400">
              Centralized records with role-based access, archiving, and a full audit trail.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map(({ icon: Icon, label, desc }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] ring-1 ring-white/10">
                  <Icon size={16} className="text-gray-300" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-gray-500">&copy; 2026 BYTES Student Council</p>
      </aside>

      <section className="flex flex-col justify-center px-6 py-12 md:px-16">
        <div className="md:hidden mb-10 flex items-center gap-3">
          <Image
            src="/byteslogo1.png"
            alt="MSU BYTES"
            width={32}
            height={32}
            className="rounded-sm"
          />
          <span className="text-base font-bold uppercase tracking-tighter text-gray-900 dark:text-white">
            BytesDoc
          </span>
        </div>

        <div className="w-full max-w-sm mx-auto">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Sign in to your BytesDoc account.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-gray-400 dark:focus:border-gray-500 transition"
                  placeholder="you@bytes.msu"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-gray-400 dark:focus:border-gray-500 transition"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 ring-1 ring-red-200 dark:ring-red-900/50">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              Sign in
              <ArrowRight size={16} />
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-500 dark:text-gray-500">
            Access is provisioned by your council administrator.
          </p>
        </div>
      </section>
    </div>
  )
}
