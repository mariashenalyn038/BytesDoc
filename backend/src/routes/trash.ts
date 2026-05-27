import { Router } from 'express'
import { supabase } from '../config/supabase'
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth'
import { logActivity } from '../lib/activityLog'
import { deleteFile } from '../lib/storage'

const router = Router()

// GET /api/trash — list all trashed documents (chief_minister only)
router.get('/', requireAuth, requireRole('chief_minister'), async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*, administrations(name)')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    const docs = (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      event: r.event,
      administration: r.administrations?.name ?? '',
      uploadedBy: r.uploaded_by,
      uploadDate: r.upload_date,
      filePath: r.file_path,
      is_archived: r.is_archived,
      is_locked: r.is_locked,
      is_deleted: r.is_deleted,
      deleted_at: r.deleted_at,
      fileType: r.file_type,
    }))

    res.json(docs)
  } catch (err) {
    next(err)
  }
})

// POST /api/trash/:id — soft-delete (move to recycle bin)
router.post('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data: existing, error: getErr } = await supabase
      .from('documents')
      .select('id, uploaded_by, is_archived, is_deleted')
      .eq('id', req.params.id)
      .single()

    if (getErr || !existing) return res.status(404).json({ error: 'document not found' })
    if (existing.is_archived) return res.status(409).json({ error: 'archived documents cannot be trashed' })
    if (existing.is_deleted) return res.status(409).json({ error: 'document is already in the recycle bin' })

    const isOwner = existing.uploaded_by === req.user!.id
    const isAdmin = req.user!.role === 'chief_minister'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'forbidden' })

    const { error: updateErr } = await supabase
      .from('documents')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)

    if (updateErr) return res.status(500).json({ error: updateErr.message })

    logActivity({ userId: req.user!.id, action: 'delete', documentId: req.params.id })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// POST /api/trash/:id/restore — restore from recycle bin
router.post('/:id/restore', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data: existing, error: getErr } = await supabase
      .from('documents')
      .select('id, uploaded_by, is_deleted')
      .eq('id', req.params.id)
      .single()

    if (getErr || !existing) return res.status(404).json({ error: 'document not found' })
    if (!existing.is_deleted) return res.status(409).json({ error: 'document is not in the recycle bin' })

    const isOwner = existing.uploaded_by === req.user!.id
    const isAdmin = req.user!.role === 'chief_minister'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'forbidden' })

    const { error: updateErr } = await supabase
      .from('documents')
      .update({ is_deleted: false, deleted_at: null })
      .eq('id', req.params.id)

    if (updateErr) return res.status(500).json({ error: updateErr.message })

    logActivity({ userId: req.user!.id, action: 'restore', documentId: req.params.id })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/trash/:id — permanently delete (chief_minister only)
router.delete('/:id', requireAuth, requireRole('chief_minister'), async (req: AuthedRequest, res, next) => {
  try {
    const { data: existing, error: getErr } = await supabase
      .from('documents')
      .select('id, file_path, is_deleted')
      .eq('id', req.params.id)
      .single()

    if (getErr || !existing) return res.status(404).json({ error: 'document not found' })
    if (!existing.is_deleted) return res.status(409).json({ error: 'document must be in the recycle bin before permanent deletion' })

    await deleteFile(existing.file_path).catch(() => {
      console.error('storage delete failed (continuing with row delete)')
    })

    const { error: delErr } = await supabase.from('documents').delete().eq('id', req.params.id)
    if (delErr) return res.status(500).json({ error: delErr.message })

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
