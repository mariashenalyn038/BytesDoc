import { Router } from 'express'
import { supabase } from '../config/supabase'
import { requireAuth, requireRole } from '../middleware/auth'
import { Event } from '../types'

const router = Router()

interface EventRow {
  id: string
  name: string
  created_at: string
}

function toEvent(r: EventRow): Event {
  return {
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
  }
}

// GET /api/events — any authenticated user
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('name', { ascending: true })
      .returns<EventRow[]>()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data.map(toEvent))
  } catch (err) {
    next(err)
  }
})

// POST /api/events — chief_minister only
router.post('/', requireAuth, requireRole('chief_minister'), async (req, res, next) => {
  try {
    const { name } = req.body ?? {}
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }

    const { data, error } = await supabase
      .from('events')
      .insert({ name: name.trim() })
      .select('*')
      .single<EventRow>()

    if (error || !data) {
      if (error?.code === '23505') {
        return res.status(409).json({ error: 'an event with this name already exists' })
      }
      return res.status(500).json({ error: error?.message ?? 'insert failed' })
    }
    res.status(201).json(toEvent(data))
  } catch (err) {
    next(err)
  }
})

// PATCH /api/events/:id — chief_minister only.
// Renames documents.event in lockstep, then rolls back the event rename if the
// document rename fails. Mirrors the cascade in routes/categories.ts.
router.patch('/:id', requireAuth, requireRole('chief_minister'), async (req, res, next) => {
  try {
    const { name } = req.body ?? {}
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }

    const { data: existing, error: getErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .single<EventRow>()

    if (getErr || !existing) {
      return res.status(getErr?.code === 'PGRST116' ? 404 : 500).json({
        error: getErr?.message ?? 'event not found',
      })
    }

    const trimmed = name.trim()
    if (trimmed === existing.name) {
      return res.json(toEvent(existing))
    }

    const { data, error } = await supabase
      .from('events')
      .update({ name: trimmed })
      .eq('id', req.params.id)
      .select('*')
      .single<EventRow>()

    if (error || !data) {
      if (error?.code === '23505') {
        return res.status(409).json({ error: 'an event with this name already exists' })
      }
      return res.status(500).json({ error: error?.message ?? 'update failed' })
    }

    const { error: docErr } = await supabase
      .from('documents')
      .update({ event: trimmed })
      .eq('event', existing.name)

    if (docErr) {
      await supabase.from('events').update({ name: existing.name }).eq('id', req.params.id)
      return res.status(500).json({ error: `failed to rename documents.event: ${docErr.message}` })
    }

    res.json(toEvent(data))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/events/:id — chief_minister only. 409 if any document references the name.
router.delete('/:id', requireAuth, requireRole('chief_minister'), async (req, res, next) => {
  try {
    const { data: existing, error: getErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .single<EventRow>()

    if (getErr || !existing) {
      return res.status(getErr?.code === 'PGRST116' ? 404 : 500).json({
        error: getErr?.message ?? 'event not found',
      })
    }

    const { count, error: countErr } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('event', existing.name)

    if (countErr) return res.status(500).json({ error: countErr.message })
    if ((count ?? 0) > 0) {
      return res.status(409).json({
        error: `cannot delete: ${count} document(s) reference event "${existing.name}"`,
      })
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', req.params.id)

    if (error) return res.status(500).json({ error: error.message })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
