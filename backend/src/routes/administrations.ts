import { Router } from 'express'
import { supabase } from '../config/supabase'
import { requireAuth, requireRole } from '../middleware/auth'
import { Administration } from '../types'

const router = Router()

interface AdministrationRow {
  id: string
  name: string
  start_date: string
  end_date: string | null
  created_at: string
}

function toAdministration(r: AdministrationRow): Administration {
  return {
    id: r.id,
    name: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    createdAt: r.created_at,
  }
}

// GET /api/administrations — any authenticated user
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('administrations')
      .select('*')
      .order('start_date', { ascending: false })
      .returns<AdministrationRow[]>()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data.map(toAdministration))
  } catch (err) {
    next(err)
  }
})

// POST /api/administrations — chief_minister only
router.post('/', requireAuth, requireRole('chief_minister'), async (req, res, next) => {
  try {
    const { name, startDate, endDate } = req.body ?? {}
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }
    if (typeof startDate !== 'string' || !startDate) {
      return res.status(400).json({ error: 'startDate is required' })
    }

    const { data, error } = await supabase
      .from('administrations')
      .insert({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate || null,
      })
      .select('*')
      .single<AdministrationRow>()

    if (error || !data) {
      if (error?.code === '23505') {
        return res.status(409).json({ error: 'an administration with this name already exists' })
      }
      return res.status(500).json({ error: error?.message ?? 'insert failed' })
    }
    res.status(201).json(toAdministration(data))
  } catch (err) {
    next(err)
  }
})

// PATCH /api/administrations/:id — chief_minister only
router.patch('/:id', requireAuth, requireRole('chief_minister'), async (req, res, next) => {
  try {
    const { name, startDate, endDate } = req.body ?? {}
    const patch: Record<string, unknown> = {}
    if (typeof name === 'string' && name.trim()) patch.name = name.trim()
    if (typeof startDate === 'string' && startDate) patch.start_date = startDate
    if (endDate === null || (typeof endDate === 'string' && endDate)) patch.end_date = endDate || null

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'no editable fields provided' })
    }

    const { data, error } = await supabase
      .from('administrations')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single<AdministrationRow>()

    if (error || !data) {
      if (error?.code === '23505') {
        return res.status(409).json({ error: 'an administration with this name already exists' })
      }
      return res.status(error?.code === 'PGRST116' ? 404 : 500).json({ error: error?.message ?? 'update failed' })
    }
    res.json(toAdministration(data))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/administrations/:id — chief_minister only. 409 if in use.
router.delete('/:id', requireAuth, requireRole('chief_minister'), async (req, res, next) => {
  try {
    const { count, error: countErr } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('administration_id', req.params.id)

    if (countErr) return res.status(500).json({ error: countErr.message })
    if ((count ?? 0) > 0) {
      return res.status(409).json({
        error: `cannot delete: ${count} document(s) reference this administration`,
      })
    }

    const { error } = await supabase
      .from('administrations')
      .delete()
      .eq('id', req.params.id)

    if (error) return res.status(500).json({ error: error.message })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
