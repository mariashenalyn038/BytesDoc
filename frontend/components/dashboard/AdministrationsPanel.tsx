'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAdministrationStore } from '@/lib/stores/administrationStore'
import { useDocumentStore } from '@/lib/stores/documentStore'
import { toast } from '@/lib/stores/toastStore'
import { confirmDialog } from '@/lib/stores/confirmStore'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Pencil, Trash2, Calendar, Plus, X, Check } from 'lucide-react'
import { Administration } from '@/types'

export default function AdministrationsPanel() {
  const {
    administrations,
    loading,
    fetchAdministrations,
    createAdministration,
    updateAdministration,
    deleteAdministration,
  } = useAdministrationStore()
  const { documents } = useDocumentStore()

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', startDate: '', endDate: '' })
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', startDate: '', endDate: '' })
  const [savingEditId, setSavingEditId] = useState<string | null>(null)

  useEffect(() => {
    void fetchAdministrations()
  }, [fetchAdministrations])

  // Count docs per administration (by name match, since that's what Document carries)
  const docCountByName = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of documents) {
      counts.set(d.administration, (counts.get(d.administration) ?? 0) + 1)
    }
    return counts
  }, [documents])

  const handleAdd = async () => {
    if (!addForm.name.trim()) return toast.error('Name is required')
    if (!addForm.startDate) return toast.error('Start date is required')
    setAdding(true)
    try {
      await createAdministration({
        name: addForm.name.trim(),
        startDate: addForm.startDate,
        endDate: addForm.endDate || null,
      })
      toast.success('Administration added')
      setAddForm({ name: '', startDate: '', endDate: '' })
      setShowAdd(false)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to add administration')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (a: Administration) => {
    setEditingId(a.id)
    setEditForm({ name: a.name, startDate: a.startDate, endDate: a.endDate ?? '' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: '', startDate: '', endDate: '' })
  }

  const saveEdit = async (a: Administration) => {
    if (!editForm.name.trim()) return toast.error('Name is required')
    setSavingEditId(a.id)
    try {
      await updateAdministration(a.id, {
        name: editForm.name.trim(),
        startDate: editForm.startDate,
        endDate: editForm.endDate || null,
      })
      toast.success('Administration updated')
      cancelEdit()
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update')
    } finally {
      setSavingEditId(null)
    }
  }

  const handleDelete = async (a: Administration) => {
    const count = docCountByName.get(a.name) ?? 0
    if (count > 0) {
      toast.error(`Cannot delete — ${count} document(s) reference "${a.name}"`)
      return
    }
    const ok = await confirmDialog({
      title: 'Delete administration?',
      message: `"${a.name}" will be permanently deleted.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteAdministration(a.id)
      toast.success('Administration deleted')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Administrations</h1>
        <Button onClick={() => setShowAdd(s => !s)}>
          <Plus size={18} className="inline mr-1" />
          {showAdd ? 'Cancel' : 'Add Administration'}
        </Button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New administration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Name</label>
              <input
                type="text"
                value={addForm.name}
                onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. 2025-2026"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Start date</label>
              <input
                type="date"
                value={addForm.startDate}
                onChange={e => setAddForm({ ...addForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                End date <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                value={addForm.endDate}
                onChange={e => setAddForm({ ...addForm, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} isLoading={adding}>Save</Button>
            <Button onClick={() => setShowAdd(false)} variant="secondary" disabled={adding}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        {!loading && administrations.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No administrations yet"
            description="Add one to populate the Administration dropdowns in upload and edit forms."
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Name</th>
                <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Start</th>
                <th className="text-left py-3 px-4 text-gray-900 dark:text-white">End</th>
                <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Documents</th>
                <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {administrations.map(a => {
                const isEditing = editingId === a.id
                const docCount = docCountByName.get(a.name) ?? 0
                return (
                  <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 text-sm"
                        />
                      ) : (
                        a.name
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.startDate}
                          onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 text-sm"
                        />
                      ) : (
                        a.startDate
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.endDate}
                          onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 text-sm"
                        />
                      ) : (
                        a.endDate ?? <span className="text-gray-400 italic">current</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{docCount}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(a)}
                              disabled={savingEditId === a.id}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Save"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={savingEditId === a.id}
                              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(a)}
                              className="text-yellow-500 hover:text-yellow-700"
                              title="Edit"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(a)}
                              className="text-red-500 hover:text-red-700"
                              title={docCount > 0 ? `In use by ${docCount} document(s)` : 'Delete'}
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
