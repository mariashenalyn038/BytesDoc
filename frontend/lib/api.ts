// Centralised API client for BytesDoc backend.
// Falls back to mock data automatically if the backend is unreachable.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

// ─── Token helpers ──────────────────────────────────────────────────────────

interface AuthSnapshot {
  token: string | null
  refreshToken: string | null
  expiresAt: number | null
}

function readAuth(): AuthSnapshot {
  if (typeof window === 'undefined') return { token: null, refreshToken: null, expiresAt: null }
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return { token: null, refreshToken: null, expiresAt: null }
    const s = JSON.parse(raw)?.state ?? {}
    return {
      token: s.token ?? null,
      refreshToken: s.refreshToken ?? null,
      expiresAt: s.expiresAt ?? null,
    }
  } catch {
    return { token: null, refreshToken: null, expiresAt: null }
  }
}

// In-flight refresh promise so concurrent calls coalesce into one network round-trip
let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  const { refreshToken } = readAuth()
  if (!refreshToken) return null

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) {
        // Refresh token itself is no longer valid — clear session so the next route guard bounces to /login
        try {
          const mod = await import('@/lib/stores/authStore')
          mod.useAuthStore.setState({
            user: null,
            token: null,
            refreshToken: null,
            expiresAt: null,
            isAuthenticated: false,
          })
        } catch {}
        return null
      }
      const body = (await res.json()) as { token: string; refreshToken: string; expiresAt: number }
      try {
        const mod = await import('@/lib/stores/authStore')
        mod.useAuthStore.setState({
          token: body.token,
          refreshToken: body.refreshToken,
          expiresAt: body.expiresAt,
        })
      } catch {}
      return body.token
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true
): Promise<T> {
  const baseHeaders: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(options.headers as Record<string, string> ?? {}),
  }

  const buildHeaders = (tok: string | null) =>
    authenticated && tok ? { ...baseHeaders, Authorization: `Bearer ${tok}` } : baseHeaders

  let auth = readAuth()

  // Proactive refresh if token is about to expire within 30s
  if (
    authenticated &&
    auth.refreshToken &&
    auth.expiresAt !== null &&
    Date.now() > auth.expiresAt - 30_000
  ) {
    const fresh = await refreshAccessToken()
    if (fresh) auth = { ...auth, token: fresh }
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers: buildHeaders(auth.token) })

  // Reactive refresh on 401 (token rejected server-side)
  if (authenticated && res.status === 401 && auth.refreshToken) {
    const fresh = await refreshAccessToken()
    if (fresh) {
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers: buildHeaders(fresh) })
    }
  }

  if (!res.ok) {
    let message = `API error ${res.status}`
    try {
      const body = await res.json()
      message = body.error ?? message
    } catch {}
    throw new Error(message)
  }

  // For CSV / blob responses
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('text/csv') || ct.includes('application/octet-stream')) {
    return res.blob() as unknown as T
  }

  return res.json() as Promise<T>
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string) {
  return apiFetch<{
    user: import('@/types').User
    token: string
    refreshToken: string
    expiresAt: number
  }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    false
  )
}

export async function apiLogout() {
  return apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' })
}

export async function apiMe() {
  return apiFetch<import('@/types').User>('/auth/me')
}

// ─── Documents ──────────────────────────────────────────────────────────────

export interface DocumentsQuery {
  category?: string
  administration?: string
  archived?: boolean
  q?: string
}

export async function apiGetDocuments(query: DocumentsQuery = {}) {
  const params = new URLSearchParams()
  if (query.category) params.set('category', query.category)
  if (query.administration) params.set('administration', query.administration)
  if (query.archived !== undefined) params.set('archived', String(query.archived))
  if (query.q) params.set('q', query.q)
  const qs = params.toString()
  return apiFetch<import('@/types').Document[]>(`/documents${qs ? `?${qs}` : ''}`)
}

export async function apiGetDocument(id: string) {
  return apiFetch<import('@/types').Document>(`/documents/${id}`)
}

export async function apiUploadDocument(
  file: File,
  meta: { title: string; category: string; event: string; administration: string; fileType: string }
) {
  const form = new FormData()
  form.append('file', file)
  Object.entries(meta).forEach(([k, v]) => form.append(k, v))
  return apiFetch<import('@/types').Document>('/documents', { method: 'POST', body: form })
}

export async function apiUpdateDocument(
  id: string,
  patch: Partial<{ title: string; category: string; event: string; administration: string }>
) {
  return apiFetch<import('@/types').Document>(`/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
}

export async function apiDeleteDocument(id: string) {
  return apiFetch<void>(`/documents/${id}`, { method: 'DELETE' })
}

export async function apiDownloadDocument(id: string) {
  return apiFetch<{ url: string; expiresInSec: number }>(`/documents/${id}/download`)
}

// ─── Archive ────────────────────────────────────────────────────────────────

export async function apiArchiveDocument(id: string) {
  return apiFetch<{ ok: boolean }>(`/documents/${id}/archive`, { method: 'POST' })
}

export async function apiBulkArchive(administration: string) {
  return apiFetch<{ ok: boolean; archivedCount: number }>('/documents/bulk-archive', {
    method: 'POST',
    body: JSON.stringify({ administration }),
  })
}

// ─── Lock ───────────────────────────────────────────────────────────────────

export async function apiLockDocument(id: string) {
  return apiFetch<{ ok: boolean }>(`/documents/${id}/lock`, { method: 'POST' })
}

export async function apiUnlockDocument(id: string) {
  return apiFetch<{ ok: boolean }>(`/documents/${id}/unlock`, { method: 'POST' })
}

export async function apiBulkLock(administration: string) {
  return apiFetch<{ ok: boolean; lockedCount: number }>('/documents/bulk-lock', {
    method: 'POST',
    body: JSON.stringify({ administration }),
  })
}

// ─── Administrations ────────────────────────────────────────────────────────

export async function apiListAdministrations() {
  return apiFetch<import('@/types').Administration[]>('/administrations')
}

export async function apiCreateAdministration(payload: {
  name: string
  startDate: string
  endDate?: string | null
}) {
  return apiFetch<import('@/types').Administration>('/administrations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function apiUpdateAdministration(
  id: string,
  payload: { name?: string; startDate?: string; endDate?: string | null },
) {
  return apiFetch<import('@/types').Administration>(`/administrations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function apiDeleteAdministration(id: string) {
  return apiFetch<void>(`/administrations/${id}`, { method: 'DELETE' })
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function apiListCategories() {
  return apiFetch<import('@/types').Category[]>('/categories')
}

export async function apiCreateCategory(payload: { name: string }) {
  return apiFetch<import('@/types').Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function apiUpdateCategory(id: string, payload: { name: string }) {
  return apiFetch<import('@/types').Category>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function apiDeleteCategory(id: string) {
  return apiFetch<void>(`/categories/${id}`, { method: 'DELETE' })
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function apiGetUsers() {
  return apiFetch<import('@/types').User[]>('/users')
}

export async function apiInviteUser(payload: {
  email: string
  name: string
  role: import('@/types').Role
}) {
  return apiFetch<import('@/types').User>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function apiUpdateUserRole(userId: string, role: import('@/types').Role) {
  return apiFetch<import('@/types').User>(`/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  })
}

// ─── Activity Logs ──────────────────────────────────────────────────────────

export interface ActivityLogsQuery {
  userId?: string
  action?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface ActivityLogEntry {
  id: string
  userId: string
  userName: string | null
  userEmail: string | null
  action: string
  documentId: string | null
  documentTitle: string | null
  timestamp: string
}

export interface ActivityLogsResponse {
  logs: ActivityLogEntry[]
  total: number
  page: number
  limit: number
}

export async function apiGetActivityLogs(query: ActivityLogsQuery = {}) {
  const params = new URLSearchParams()
  if (query.userId) params.set('userId', query.userId)
  if (query.action) params.set('action', query.action)
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  const qs = params.toString()
  return apiFetch<ActivityLogsResponse>(`/activity-logs${qs ? `?${qs}` : ''}`)
}

export async function apiExportActivityLogs(query: ActivityLogsQuery = {}): Promise<Blob> {
  const params = new URLSearchParams()
  if (query.userId) params.set('userId', query.userId)
  if (query.action) params.set('action', query.action)
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  const qs = params.toString()
  return apiFetch<Blob>(`/activity-logs/export${qs ? `?${qs}` : ''}`)
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalDocuments: number
  activeDocuments: number
  archivedDocuments: number
  recentUploads: number
  myUploads: number
  docsPerCategory: { name: string; value: number }[]
  uploadsOverTime: { name: string; value: number }[]
  recentDocuments: {
    id: string
    title: string
    category: string
    uploadDate: string
    uploaderName: string
  }[]
  activitySummary: {
    uploads: number
    downloads: number
    views: number
    logins: number
  } | null
}

export async function apiGetDashboardStats() {
  return apiFetch<DashboardStats>('/dashboard/stats')
}

// ─── Backend health check ────────────────────────────────────────────────────

export async function apiHealthCheck(): Promise<boolean> {
  try {
    await apiFetch<{ ok: boolean }>('/health', {}, false)
    return true
  } catch {
    return false
  }
}