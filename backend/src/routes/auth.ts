import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { supabase, supabasePublic } from '../config/supabase'
import { requireAuth, AuthedRequest } from '../middleware/auth'
import { Role } from '../types'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

interface ProfileRow {
  id: string
  email: string
  name: string
  role: { role_name: Role }
  created_at: string
  status: string
}

function toUser(p: ProfileRow) {
  return {
    id: p.id,
    email: p.email,
    fullName: p.name,
    role: p.role.role_name,
    createdAt: p.created_at,
    status: p.status ?? 'active',
  }
}

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const { data, error } = await supabasePublic.auth.signInWithPassword({ email, password })
    if (error || !data.session || !data.user) {
      return res.status(401).json({ error: 'invalid email or password' })
    }

    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('id, email, name, role:roles(role_name), created_at, status')
      .eq('id', data.user.id)
      .single<ProfileRow>()

    if (profileErr || !profile) {
      return res.status(403).json({ error: 'user profile not found' })
    }

    if (profile.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending approval by an administrator' })
    }
    if (profile.status === 'rejected') {
      return res.status(403).json({ error: 'Your account has been rejected' })
    }

    supabase
      .from('activity_logs')
      .insert({ user_id: profile.id, action: 'login' })
      .then(({ error: logErr }) => {
        if (logErr) console.error('activity log insert failed:', logErr.message)
      })

    res.json({
      user: toUser(profile),
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: (data.session.expires_at ?? 0) * 1000,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body ?? {}
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' })
    }
    const { data, error } = await supabasePublic.auth.refreshSession({ refresh_token: refreshToken })
    if (error || !data.session) {
      return res.status(401).json({ error: 'refresh failed' })
    }
    res.json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: (data.session.expires_at ?? 0) * 1000,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/logout', requireAuth, (_req, res) => {
  // JWTs are stateless — frontend drops the token on its side.
  res.json({ ok: true })
})

router.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role:roles(role_name), created_at')
      .eq('id', req.user!.id)
      .single<ProfileRow>()

    if (error || !data) {
      return res.status(404).json({ error: 'user not found' })
    }
    res.json(toUser(data))
  } catch (err) {
    next(err)
  }
})

router.patch('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (!name) return res.status(400).json({ error: 'name is required' })
    if (name.length > 80) return res.status(400).json({ error: 'name too long (max 80)' })

    const { data, error } = await supabase
      .from('users')
      .update({ name })
      .eq('id', req.user!.id)
      .select('id, email, name, role:roles(role_name), created_at')
      .single<ProfileRow>()

    if (error || !data) {
      return res.status(500).json({ error: error?.message ?? 'update failed' })
    }
    res.json(toUser(data))
  } catch (err) {
    next(err)
  }
})

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password, name } = req.body ?? {}
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'name, email and password are required' })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'invalid email address' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' })
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'name must be at least 2 characters' })
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authErr || !authData.user) {
      const msg = authErr?.message ?? 'registration failed'
      if (msg.toLowerCase().includes('already')) {
        return res.status(409).json({ error: 'an account with this email already exists' })
      }
      return res.status(500).json({ error: msg })
    }

    // Resolve member role id
    const { data: roleRow, error: roleErr } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', 'member')
      .single<{ id: number }>()

    if (roleErr || !roleRow) {
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {})
      return res.status(500).json({ error: 'could not resolve role' })
    }

    // Insert profile row with pending status
    const { error: insertErr } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name: name.trim(),
        role_id: roleRow.id,
        status: 'pending',
      })

    if (insertErr) {
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {})
      return res.status(500).json({ error: insertErr.message })
    }

    res.status(201).json({ ok: true, message: 'Registration successful. Your account is pending approval.' })
  } catch (err) {
    next(err)
  }
})

export default router
