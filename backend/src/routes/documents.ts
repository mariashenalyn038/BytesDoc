import { Router } from 'express'
import multer from 'multer'
import { supabase } from '../config/supabase'
import { requireAuth, requireRole, AuthedRequest } from '../middleware/auth'
import { logActivity } from '../lib/activityLog'
import { uploadFile, createSignedUrl, deleteFile, buildKey } from '../lib/storage'
import { Document, Role } from '../types'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

const FILE_TYPES = ['pdf', 'docx'] as const

// Role visibility policy for category names. These stay hardcoded because they
// describe what each role is allowed to handle, not what categories exist.
// Any category not listed here is treated as non-financial: visible to
// chief_minister/member/secretary, hidden from finance_minister.
const FINANCE_CATEGORIES = new Set<string>(['Budgets', 'Financial Records'])
const FINANCE_VISIBLE = new Set<string>(['Budgets', 'Financial Records', 'Reports'])

async function isKnownCategoryName(name: string): Promise<boolean> {
  const trimmed = name.trim()
  if (!trimmed) return false
  const { data } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', trimmed)
    .maybeSingle<{ id: string }>()
  return !!data
}

interface DocumentRow {
  id: string
  title: string
  category: string
  event: string
  administration_id: string
  administrations: { name: string } | null
  uploaded_by: string
  upload_date: string
  file_path: string
  is_archived: boolean
  is_locked: boolean
  file_type: Document['fileType']
}

const DOCUMENT_SELECT = '*, administrations(name)'

function toDocument(r: DocumentRow): Document {
  return {
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
    fileType: r.file_type,
  }
}

export async function findAdministrationIdByName(name: string): Promise<string | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const { data } = await supabase
    .from('administrations')
    .select('id')
    .ilike('name', trimmed)
    .maybeSingle<{ id: string }>()
  return data?.id ?? null
}

function categoryAllowedForRole(role: Role, category: string): boolean {
  if (role === 'chief_minister' || role === 'member') return true
  if (role === 'secretary') return !FINANCE_CATEGORIES.has(category)
  if (role === 'finance_minister') return FINANCE_VISIBLE.has(category)
  return false
}

function canUploadCategory(role: Role, category: string): boolean {
  if (role === 'chief_minister') return true
  if (role === 'secretary') return !FINANCE_CATEGORIES.has(category)
  if (role === 'finance_minister') return FINANCE_VISIBLE.has(category)
  return false
}

router.get('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { category, administration, archived, q } = req.query
    let query = supabase.from('documents').select(DOCUMENT_SELECT).order('upload_date', { ascending: false })

    if (typeof category === 'string') query = query.eq('category', category)
    if (typeof administration === 'string') {
      const adminId = await findAdministrationIdByName(administration)
      if (!adminId) return res.json([])
      query = query.eq('administration_id', adminId)
    }
    if (archived === 'true') query = query.eq('is_archived', true)
    else if (archived === 'false') query = query.eq('is_archived', false)
    if (typeof q === 'string' && q.trim()) query = query.ilike('title', `%${q.trim()}%`)

    const { data, error } = await query.returns<DocumentRow[]>()
    if (error) return res.status(500).json({ error: error.message })

    const role = req.user!.role
    const filtered = data.filter((row) => categoryAllowedForRole(role, row.category))
    res.json(filtered.map(toDocument))
  } catch (err) {
    next(err)
  }
})

router.get('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select(DOCUMENT_SELECT)
      .eq('id', req.params.id)
      .single<DocumentRow>()

    if (error || !data) return res.status(404).json({ error: 'document not found' })
    if (!categoryAllowedForRole(req.user!.role, data.category)) {
      return res.status(403).json({ error: 'forbidden' })
    }

    logActivity({ userId: req.user!.id, action: 'view', documentId: data.id })
    res.json(toDocument(data))
  } catch (err) {
    next(err)
  }
})

router.post('/', requireAuth, upload.single('file'), async (req: AuthedRequest, res, next) => {
  try {
    const role = req.user!.role
    if (role === 'member') return res.status(403).json({ error: 'members cannot upload' })

    if (!req.file) return res.status(400).json({ error: 'file is required' })

    const { title, category, event, administration, fileType } = req.body ?? {}
    if (!title || !category || !event || !administration || !fileType) {
      return res
        .status(400)
        .json({ error: 'title, category, event, administration, fileType are required' })
    }
    if (typeof category !== 'string' || !(await isKnownCategoryName(category))) {
      return res.status(400).json({ error: `category "${category}" is not a known category` })
    }
    if (!FILE_TYPES.includes(fileType)) {
      return res.status(400).json({ error: `fileType must be one of ${FILE_TYPES.join(', ')}` })
    }
    if (!canUploadCategory(role, category)) {
      return res.status(403).json({ error: `your role cannot upload ${category}` })
    }

    const administrationId = await findAdministrationIdByName(administration)
    if (!administrationId) {
      return res.status(400).json({ error: `administration "${administration}" does not exist` })
    }

    // Phase 1: insert row to get an id, with a placeholder file_path.
    const { data: created, error: insertErr } = await supabase
      .from('documents')
      .insert({
        title,
        category,
        event,
        administration_id: administrationId,
        uploaded_by: req.user!.id,
        file_path: 'pending',
        file_type: fileType,
      })
      .select(DOCUMENT_SELECT)
      .single<DocumentRow>()

    if (insertErr || !created) {
      return res.status(500).json({ error: insertErr?.message ?? 'insert failed' })
    }

    const key = buildKey(created.id, req.file.originalname)

    // Phase 2: upload file. If it fails, roll back the row.
    try {
      await uploadFile(key, req.file.buffer, req.file.mimetype)
    } catch (e) {
      await supabase.from('documents').delete().eq('id', created.id)
      throw e
    }

    // Phase 3: patch the row with the real key.
    const { data: updated, error: updateErr } = await supabase
      .from('documents')
      .update({ file_path: key })
      .eq('id', created.id)
      .select(DOCUMENT_SELECT)
      .single<DocumentRow>()

    if (updateErr || !updated) {
      await deleteFile(key).catch(() => {})
      await supabase.from('documents').delete().eq('id', created.id)
      return res.status(500).json({ error: updateErr?.message ?? 'update failed' })
    }

    logActivity({ userId: req.user!.id, action: 'upload', documentId: updated.id })
    res.status(201).json(toDocument(updated))
  } catch (err) {
    next(err)
  }
})

router.put('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data: existing, error: getErr } = await supabase
      .from('documents')
      .select(DOCUMENT_SELECT)
      .eq('id', req.params.id)
      .single<DocumentRow>()

    if (getErr || !existing) return res.status(404).json({ error: 'document not found' })

    const isOwner = existing.uploaded_by === req.user!.id
    const isAdmin = req.user!.role === 'chief_minister'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'forbidden' })

    if (existing.is_archived || existing.is_locked) {
      return res.status(409).json({ error: 'cannot edit archived or locked document' })
    }

    const { title, category, event, administration } = req.body ?? {}
    const patch: Record<string, unknown> = {}
    if (typeof title === 'string') patch.title = title
    if (typeof event === 'string') patch.event = event
    if (typeof administration === 'string') {
      const adminId = await findAdministrationIdByName(administration)
      if (!adminId) {
        return res.status(400).json({ error: `administration "${administration}" does not exist` })
      }
      patch.administration_id = adminId
    }
    if (typeof category === 'string') {
      if (!(await isKnownCategoryName(category))) {
        return res.status(400).json({ error: `category "${category}" is not a known category` })
      }
      patch.category = category
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'no editable fields provided' })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('documents')
      .update(patch)
      .eq('id', req.params.id)
      .select(DOCUMENT_SELECT)
      .single<DocumentRow>()

    if (updateErr || !updated) {
      return res.status(500).json({ error: updateErr?.message ?? 'update failed' })
    }
    res.json(toDocument(updated))
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data: existing, error: getErr } = await supabase
      .from('documents')
      .select(DOCUMENT_SELECT)
      .eq('id', req.params.id)
      .single<DocumentRow>()

    if (getErr || !existing) return res.status(404).json({ error: 'document not found' })

    const isOwner = existing.uploaded_by === req.user!.id
    const isAdmin = req.user!.role === 'chief_minister'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'forbidden' })

    if (existing.is_archived) {
      return res.status(409).json({ error: 'cannot delete archived document' })
    }

    await deleteFile(existing.file_path).catch((e) => {
      console.error('storage delete failed (continuing with row delete):', e.message)
    })

    const { error: delErr } = await supabase.from('documents').delete().eq('id', req.params.id)
    if (delErr) return res.status(500).json({ error: delErr.message })

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.get('/:id/download', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select(DOCUMENT_SELECT)
      .eq('id', req.params.id)
      .single<DocumentRow>()

    if (error || !data) return res.status(404).json({ error: 'document not found' })
    if (!categoryAllowedForRole(req.user!.role, data.category)) {
      return res.status(403).json({ error: 'forbidden' })
    }

    const url = await createSignedUrl(data.file_path, 60)
    logActivity({ userId: req.user!.id, action: 'download', documentId: data.id })
    res.json({ url, expiresInSec: 60 })
  } catch (err) {
    next(err)
  }
})

router.post(
  '/:id/archive',
  requireAuth,
  requireRole('chief_minister'),
  async (req: AuthedRequest, res, next) => {
    try {
      const { data: existing, error: getErr } = await supabase
        .from('documents')
        .select('*')
        .eq('id', req.params.id)
        .single<DocumentRow>()

      if (getErr || !existing) return res.status(404).json({ error: 'document not found' })
      if (existing.is_archived) {
        return res.status(409).json({ error: 'document already archived' })
      }

      const { data: updated, error: updateErr } = await supabase
        .from('documents')
        .update({ is_archived: true, is_locked: true })
        .eq('id', req.params.id)
        .select('*')
        .single<DocumentRow>()

      if (updateErr || !updated) {
        return res.status(500).json({ error: updateErr?.message ?? 'archive failed' })
      }

      logActivity({ userId: req.user!.id, action: 'archive', documentId: updated.id })
      res.json(toDocument(updated))
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/archive-bulk',
  requireAuth,
  requireRole('chief_minister'),
  async (req: AuthedRequest, res, next) => {
    try {
      const { administration } = req.body ?? {}
      if (typeof administration !== 'string' || !administration.trim()) {
        return res.status(400).json({ error: 'administration is required' })
      }

      const { data: updated, error: updateErr } = await supabase
        .from('documents')
        .update({ is_archived: true, is_locked: true })
        .eq('administration', administration)
        .eq('is_archived', false)
        .select('id')
        .returns<{ id: string }[]>()

      if (updateErr) return res.status(500).json({ error: updateErr.message })

      const archivedIds = (updated ?? []).map((r) => r.id)
      for (const id of archivedIds) {
        logActivity({ userId: req.user!.id, action: 'archive', documentId: id })
      }

      res.json({ administration, archivedCount: archivedIds.length, archivedIds })
    } catch (err) {
      next(err)
    }
  }
)

export default router
