'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import { getSupabaseClient } from '@/lib/supabaseClient'

type Phase = 'loading' | 'ready' | 'invalid' | 'success'

export default function AcceptInvitePage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('loading')
  const [invalidReason, setInvalidReason] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')
    const errorDescription = params.get('error_description')

    if (errorDescription) {
      setInvalidReason(errorDescription.replace(/\+/g, ' '))
      setPhase('invalid')
      return
    }

    if (!accessToken || !refreshToken) {
      setInvalidReason('This invite link is missing its tokens. Ask your administrator to send a new invite.')
      setPhase('invalid')
      return
    }

    if (type && type !== 'invite' && type !== 'recovery' && type !== 'signup') {
      setInvalidReason(`Unexpected link type "${type}". Ask your administrator to send a new invite.`)
      setPhase('invalid')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const supabase = getSupabaseClient()
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (cancelled) return
        if (error) {
          setInvalidReason(error.message || 'Invite link is no longer valid.')
          setPhase('invalid')
          return
        }
        // Clear the hash so the tokens don't sit in the URL bar.
        window.history.replaceState(null, '', window.location.pathname)
        setPhase('ready')
      } catch (e: any) {
        if (cancelled) return
        setInvalidReason(e?.message ?? 'Could not initialise invite session.')
        setPhase('invalid')
      }
    })()

    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const supabase = getSupabaseClient()
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) {
        setError(updateErr.message || 'Could not set your password. Try again.')
        return
      }
      // Drop the Supabase session — the app uses its own JWT issued by the backend.
      await supabase.auth.signOut().catch(() => {})
      setPhase('success')
      setTimeout(() => router.push('/login'), 2500)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-surface-dark px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image
            src="/byteslogo1.png"
            alt="MSU BYTES"
            width={36}
            height={36}
            className="rounded-sm"
          />
          <span className="text-lg font-bold uppercase tracking-tighter text-gray-900 dark:text-white">
            BytesDoc
          </span>
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 p-8 shadow-sm">
          {phase === 'loading' && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Validating your invite…</p>
            </div>
          )}

          {phase === 'invalid' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Invite link can't be used
                  </h1>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {invalidReason}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Invite links expire after 24 hours and can only be opened once. Ask your administrator to resend.
              </p>
              <Button onClick={() => router.push('/login')} variant="secondary" className="w-full">
                Back to login
              </Button>
            </div>
          )}

          {phase === 'ready' && (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Set your password
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Finish setting up your BytesDoc account.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2"
                  >
                    New password
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
                      autoComplete="new-password"
                      minLength={8}
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-gray-400 dark:focus:border-gray-500 transition"
                      placeholder="At least 8 characters"
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

                <div>
                  <label
                    htmlFor="confirm"
                    className="block text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                    />
                    <input
                      id="confirm"
                      type={showPassword ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-gray-400 dark:focus:border-gray-500 transition"
                      placeholder="Repeat password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 ring-1 ring-red-200 dark:ring-red-900/50">
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}

                <Button type="submit" variant="primary" isLoading={submitting} className="w-full mt-2">
                  {submitting ? 'Saving…' : 'Set password & continue'}
                  {!submitting && <ArrowRight size={16} />}
                </Button>
              </form>
            </>
          )}

          {phase === 'success' && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Password set
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Redirecting to login…
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
