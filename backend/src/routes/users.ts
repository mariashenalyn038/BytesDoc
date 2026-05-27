import { Router } from 'express'
import { supabase } from '../config/supabase'
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth'
import { Role } from '../types'

const router = Router()

interface ProfileRow {
  id: string
  email: string
  name: string
  role: { role_name: Role }
  created_at: string
}

function toUser(p: ProfileRow, auth?: { email_confirmed_at: string | null } | null) {
  return {
    id: p.id,
    email: p.email,
    fullName: p.name,
    role: p.role.role_name,
    // If we have auth metadata: confirmed = active, not confirmed = pending.
    // Fall back to 'active' if auth lookup wasn't available.
    status: auth ? (auth.email_confirmed_at ? 'active' : 'pending') : 'active',
    createdAt: p.created_at,
  }
}

// GET /api/users — list all users (chief_minister only)
router.get('/', requireAuth, requireRole('chief_minister'), async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role:roles(role_name), created_at')
      .order('created_at', { ascending: true })
      .returns<ProfileRow[]>()

    if (error) return res.status(500).json({ error: error.message })

    // Fetch auth metadata to determine pending vs active status.
    // invited_at is set on invite; email_confirmed_at is set when they accept.
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const authMap = new Map<string, { email_confirmed_at: string | null }>(
      (authErr || !authData) ? [] :
      authData.users.map(u => [u.id, { email_confirmed_at: u.email_confirmed_at ?? null }])
    )

    res.json(data.map(p => toUser(p, authMap.get(p.id))))
  } catch (err) {
    next(err)
  }
})

// POST /api/users — send invite email via Supabase Auth and create profile row (chief_minister only)
// The recipient gets an email with a link to set their password; on click, Supabase Auth
// confirms the account. The public.users row is pre-created so the user appears in the list
// immediately (with role pre-assigned) regardless of whether they've accepted yet.
router.post('/', requireAuth, requireRole('chief_minister'), async (req, res, next) => {
  try {
    const { email, name, role } = req.body ?? {}
    if (!email || !name || !role) {
      return res.status(400).json({ error: 'email, name, role are required' })
    }

    const VALID_ROLES: Role[] = ['chief_minister', 'secretary', 'finance_minister', 'member']
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(', ')}` })
    }

    // Resolve role_id up-front so we don't send an email if the role lookup fails
    const { data: roleRow, error: roleErr } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', role)
      .single<{ id: number }>()

    if (roleErr || !roleRow) {
      return res.status(500).json({ error: 'could not resolve role' })
    }

    // Send the invite email — creates an auth.users row in "invited" state.
    // Supabase appends the access/refresh tokens to redirectTo as a URL hash;
    // the /accept-invite page parses them and prompts the user to set a password.
    const redirectTo = (process.env.FRONTEND_URL || 'http://localhost:3000') + '/accept-invite'
    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
      email,
      { data: { name, role }, redirectTo }
    )

    if (inviteErr || !inviteData?.user) {
      console.error('[invite] supabase.auth.admin.inviteUserByEmail failed:', {
        email,
        message: inviteErr?.message,
        status: (inviteErr as any)?.status,
        code: (inviteErr as any)?.code,
        name: inviteErr?.name,
        raw: inviteErr,
      })
      const msg = inviteErr?.message?.trim() || 'could not send invite'
      if (msg.toLowerCase().includes('already')) {
        return res.status(409).json({ error: 'a user with this email already exists' })
      }
      return res.status(500).json({ error: msg })
    }

    const newUserId = inviteData.user.id

    // Insert profile row using the auth user's ID.
    // On unique-constraint conflicts we DO NOT delete the auth user — doing so would
    // invalidate the invite token that Supabase just emailed, breaking the link the
    // recipient is about to click. Instead we detect re-invites and return the
    // existing profile so the caller sees a clean success.
    const { data, error } = await supabase
      .from('users')
      .insert({ id: newUserId, email, name, role_id: roleRow.id })
      .select('id, email, name, role:roles(role_name), created_at')
      .single<ProfileRow>()

    if (error || !data) {
      if (error?.code === '23505') {
        // Re-invite of an existing auth user: a profile with this id already exists.
        // Email has already been re-sent by inviteUserByEmail — return the existing profile.
        const { data: existingById } = await supabase
          .from('users')
          .select('id, email, name, role:roles(role_name), created_at')
          .eq('id', newUserId)
          .maybeSingle<ProfileRow>()
        if (existingById) {
          return res.status(200).json(toUser(existingById))
        }
        // Orphan profile from a past failed attempt — email collides but id doesn't.
        // The new auth user we just created has no profile to log into, so roll it back
        // (its invite link is dead either way without a matching profile row).
        await supabase.auth.admin.deleteUser(newUserId).catch(() => {})
        return res.status(409).json({
          error: 'a stale profile row exists for this email — delete it in the Supabase users table, then retry',
        })
      }
      // Genuine failure unrelated to a duplicate — safe to roll back the auth user.
      await supabase.auth.admin.deleteUser(newUserId).catch(() => {})
      return res.status(500).json({ error: error?.message ?? 'profile creation failed' })
    }

    res.status(201).json({ ...toUser(data), status: 'pending' })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/users/:id — chief_minister can rename any user
router.patch('/:id', requireAuth, requireRole('chief_minister'), async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (!name) return res.status(400).json({ error: 'name is required' })
    if (name.length > 80) return res.status(400).json({ error: 'name too long (max 80)' })

    const { data, error } = await supabase
      .from('users')
      .update({ name })
      .eq('id', req.params.id)
      .select('id, email, name, role:roles(role_name), created_at')
      .single<ProfileRow>()

    if (error || !data) {
      return res.status(404).json({ error: 'user not found' })
    }
    res.json(toUser(data))
  } catch (err) {
    next(err)
  }
})

// PUT /api/users/:id/role — change a user's role (chief_minister only)
router.put('/:id/role', requireAuth, requireRole('chief_minister'), async (req: AuthedRequest, res, next) => {
  try {
    const { role } = req.body ?? {}
    const VALID_ROLES: Role[] = ['chief_minister', 'secretary', 'finance_minister', 'member']
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(', ')}` })
    }

    // Prevent self-demotion
    if (req.params.id === req.user!.id && role !== 'chief_minister') {
      return res.status(400).json({ error: 'cannot change your own role' })
    }

    const { data: roleRow, error: roleErr } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', role)
      .single<{ id: number }>()

    if (roleErr || !roleRow) {
      return res.status(500).json({ error: 'could not resolve role' })
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role_id: roleRow.id })
      .eq('id', req.params.id)
      .select('id, email, name, role:roles(role_name), created_at')
      .single<ProfileRow>()

    if (error || !data) {
      return res.status(404).json({ error: 'user not found' })
    }

    res.json(toUser(data))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/users/:id — remove a user (chief_minister only)
// Deletes both the public.users profile row and the auth.users account.
router.delete('/:id', requireAuth, requireRole('chief_minister'), async (req: AuthedRequest, res, next) => {
  try {
    // Prevent self-removal
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: 'cannot remove yourself' })
    }

    // Delete the profile row first (FK constraints cascade or restrict as needed)
    const { error: profileErr } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id)

    if (profileErr) {
      return res.status(500).json({ error: profileErr.message })
    }

    // Delete the auth account so the user can no longer log in
    const { error: authErr } = await supabase.auth.admin.deleteUser(req.params.id)
    if (authErr) {
      // Profile is already gone — log the auth cleanup failure but don't fail the request
      console.error('[removeUser] auth.admin.deleteUser failed:', authErr.message)
    }

    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export default router