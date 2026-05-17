import { Router } from 'express'
import { supabase } from '../config/supabase'
import { requireAuth, requireRole } from '../middleware/auth'
import { Category } from '../types'

const router = Router()

interface CategoryRow {
  id: string
  name: string
  created_at: string
}

function toCategory(r: CategoryRow): Category {
  return {
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
  }
}

// GET /api/categories — any authenticated user
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })
      .returns<CategoryRow[]>()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data.map(toCategory))
  } catch (err) {
    next(err)
  }
})

// POST /api/categories — chief_minister only
router.post('/', requireAuth, requireRole('chief_minister'), async (req, res, next) => {
  try {
    const { name } = req.body ?? {}
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: name.trim() })
      .select('*')
      .single<CategoryRow>()

    if (error || !data) {
      if (error?.code === '23505') {
        return res.status(409).json({ error: 'a category with this name already exists' })
      }
      return res.status(500).json({ error: error?.message ?? 'insert failed' })
    }
    res.status(201).json(toCategory(data))
  } catch (err) {
    next(err)
  }
})

// PATCH /api/categories/:id — chief_minister only
router.patch('/:id', requireAuth, requireRole('chief_minister'), async (req, res, next) => {
  try {
    const { name } = req.body ?? {}
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }

    // Look up old name first so we can update any documents that reference it
    // by text. (documents.category is still a TEXT column; the categories
    // table is a managed lookup, not a FK target.)
    const { data: existing, error: getErr } = await supabase
      .from('categories')
      .select('*')
      .eq('id', req.params.id)
      .single<CategoryRow>()

    if (getErr || !existing) {
      return res.status(getErr?.code === 'PGRST116' ? 404 : 500).json({
        error: getErr?.message ?? 'category not found',
      })
    }

    const trimmed = name.trim()
    if (trimmed === existing.name) {
      return res.json(toCategory(existing))
    }

    const { data, error } = await supabase
      .from('categories')
      .update({ name: trimmed })
      .eq('id', req.params.id)
      .select('*')
      .single<CategoryRow>()

    if (error || !data) {
      if (error?.code === '23505') {
        return res.status(409).json({ error: 'a category with this name already exists' })
      }
      return res.status(500).json({ error: error?.message ?? 'update failed' })
    }

    // Keep documents in sync — rename the text value too.
    const { error: docErr } = await supabase
      .from('documents')
      .update({ category: trimmed })
      .eq('category', existing.name)

    if (docErr) {
      // Roll back the category rename so the lookup stays consistent with docs.
      await supabase.from('categories').update({ name: existing.name }).eq('id', req.params.id)
      return res.status(500).json({ error: `failed to rename documents.category: ${docErr.message}` })
    }

    res.json(toCategory(data))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/categories/:id — chief_minister only. 409 if in use by any document.
router.delete('/:id', requireAuth, requireRole('chief_minister'), async (req, res, next) => {
  try {
    const { data: existing, error: getErr } = await supabase
      .from('categories')
      .select('*')
      .eq('id', req.params.id)
      .single<CategoryRow>()

    if (getErr || !existing) {
      return res.status(getErr?.code === 'PGRST116' ? 404 : 500).json({
        error: getErr?.message ?? 'category not found',
      })
    }

    const { count, error: countErr } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('category', existing.name)

    if (countErr) return res.status(500).json({ error: countErr.message })
    if ((count ?? 0) > 0) {
      return res.status(409).json({
        error: `cannot delete: ${count} document(s) reference category "${existing.name}"`,
      })
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id)

    if (error) return res.status(500).json({ error: error.message })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
