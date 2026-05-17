import { Router } from 'express'
import { supabase } from '../config/supabase'
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth'
import { logActivity } from '../lib/activityLog'
import { findAdministrationIdByName } from './documents'

const router = Router()

// POST /api/documents/:id/archive — archive + lock a single document
// Only chief_minister or the uploader can archive
router.post('/:id/archive', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data: existing, error: getErr } = await supabase
      .from('documents')
      .select('id, uploaded_by, is_archived')
      .eq('id', req.params.id)
      .single()

    if (getErr || !existing) return res.status(404).json({ error: 'document not found' })
    if (existing.is_archived) return res.status(409).json({ error: 'document already archived' })

    const isOwner = existing.uploaded_by === req.user!.id
    const isAdmin = req.user!.role === 'chief_minister'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'forbidden' })

    const { data: updated, error: updateErr } = await supabase
      .from('documents')
      .update({ is_archived: true, is_locked: true })
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (updateErr || !updated) {
      return res.status(500).json({ error: updateErr?.message ?? 'update failed' })
    }

    logActivity({ userId: req.user!.id, action: 'archive', documentId: updated.id })
    res.json({ ok: true, document: updated })
  } catch (err) {
    next(err)
  }
})

// POST /api/documents/bulk-archive — archive all docs of a given administration term
// chief_minister only
router.post('/bulk-archive', requireAuth, requireRole('chief_minister'), async (req: AuthedRequest, res, next) => {
  try {
    const { administration } = req.body ?? {}
    if (!administration) {
      return res.status(400).json({ error: 'administration is required' })
    }

    const adminId = await findAdministrationIdByName(administration)
    if (!adminId) {
      return res.status(400).json({ error: `administration "${administration}" does not exist` })
    }

    const { data, error } = await supabase
      .from('documents')
      .update({ is_archived: true, is_locked: true })
      .eq('administration_id', adminId)
      .eq('is_archived', false)
      .select('id')

    if (error) return res.status(500).json({ error: error.message })

    const ids = (data ?? []).map((d: { id: string }) => d.id)
    ids.forEach(id => logActivity({ userId: req.user!.id, action: 'archive', documentId: id }))

    res.json({ ok: true, archivedCount: ids.length, archivedIds: ids })
  } catch (err) {
    next(err)
  }
})

// POST /api/documents/:id/lock — mark a document read-only without archiving
// Owner or chief_minister. Refuses if already locked or already archived.
router.post('/:id/lock', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data: existing, error: getErr } = await supabase
      .from('documents')
      .select('id, uploaded_by, is_archived, is_locked')
      .eq('id', req.params.id)
      .single()

    if (getErr || !existing) return res.status(404).json({ error: 'document not found' })
    if (existing.is_archived) return res.status(409).json({ error: 'document is archived' })
    if (existing.is_locked) return res.status(409).json({ error: 'document already locked' })

    const isOwner = existing.uploaded_by === req.user!.id
    const isAdmin = req.user!.role === 'chief_minister'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'forbidden' })

    const { data: updated, error: updateErr } = await supabase
      .from('documents')
      .update({ is_locked: true })
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (updateErr || !updated) {
      return res.status(500).json({ error: updateErr?.message ?? 'update failed' })
    }

    logActivity({ userId: req.user!.id, action: 'lock', documentId: updated.id })
    res.json({ ok: true, document: updated })
  } catch (err) {
    next(err)
  }
})

// POST /api/documents/:id/unlock — clear read-only flag
// Owner or chief_minister. Refuses if archived (unlocking an archived doc would
// partially undo the archive state) or if not currently locked.
router.post('/:id/unlock', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data: existing, error: getErr } = await supabase
      .from('documents')
      .select('id, uploaded_by, is_archived, is_locked')
      .eq('id', req.params.id)
      .single()

    if (getErr || !existing) return res.status(404).json({ error: 'document not found' })
    if (existing.is_archived) return res.status(409).json({ error: 'document is archived' })
    if (!existing.is_locked) return res.status(409).json({ error: 'document is not locked' })

    const isOwner = existing.uploaded_by === req.user!.id
    const isAdmin = req.user!.role === 'chief_minister'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'forbidden' })

    const { data: updated, error: updateErr } = await supabase
      .from('documents')
      .update({ is_locked: false })
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (updateErr || !updated) {
      return res.status(500).json({ error: updateErr?.message ?? 'update failed' })
    }

    logActivity({ userId: req.user!.id, action: 'unlock', documentId: updated.id })
    res.json({ ok: true, document: updated })
  } catch (err) {
    next(err)
  }
})

// POST /api/documents/bulk-lock — lock all non-archived, non-locked docs of an administration
// chief_minister only
router.post('/bulk-lock', requireAuth, requireRole('chief_minister'), async (req: AuthedRequest, res, next) => {
  try {
    const { administration } = req.body ?? {}
    if (!administration) {
      return res.status(400).json({ error: 'administration is required' })
    }

    const adminId = await findAdministrationIdByName(administration)
    if (!adminId) {
      return res.status(400).json({ error: `administration "${administration}" does not exist` })
    }

    const { data, error } = await supabase
      .from('documents')
      .update({ is_locked: true })
      .eq('administration_id', adminId)
      .eq('is_archived', false)
      .eq('is_locked', false)
      .select('id')

    if (error) return res.status(500).json({ error: error.message })

    const ids = (data ?? []).map((d: { id: string }) => d.id)
    ids.forEach(id => logActivity({ userId: req.user!.id, action: 'lock', documentId: id }))

    res.json({ ok: true, lockedCount: ids.length, lockedIds: ids })
  } catch (err) {
    next(err)
  }
})

export default router