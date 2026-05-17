'use client'

import { useEffect, useMemo, useState } from 'react'
import { useEventStore } from '@/lib/stores/eventStore'
import { useDocumentStore } from '@/lib/stores/documentStore'
import { toast } from '@/lib/stores/toastStore'
import { confirmDialog } from '@/lib/stores/confirmStore'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Pencil, Trash2, CalendarDays, Plus, X, Check } from 'lucide-react'
import { Event } from '@/types'

export default function EventsPanel() {
  const {
    events,
    loading,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useEventStore()
  const { documents } = useDocumentStore()

  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [savingEditId, setSavingEditId] = useState<string | null>(null)

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  const docCountByName = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of documents) {
      counts.set(d.event, (counts.get(d.event) ?? 0) + 1)
    }
    return counts
  }, [documents])

  const handleAdd = async () => {
    if (!addName.trim()) return toast.error('Name is required')
    setAdding(true)
    try {
      await createEvent({ name: addName.trim() })
      toast.success('Event added')
      setAddName('')
      setShowAdd(false)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to add event')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (e: Event) => {
    setEditingId(e.id)
    setEditName(e.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const saveEdit = async (e: Event) => {
    if (!editName.trim()) return toast.error('Name is required')
    setSavingEditId(e.id)
    try {
      await updateEvent(e.id, { name: editName.trim() })
      toast.success('Event updated')
      cancelEdit()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update')
    } finally {
      setSavingEditId(null)
    }
  }

  const handleDelete = async (e: Event) => {
    const count = docCountByName.get(e.name) ?? 0
    if (count > 0) {
      toast.error(`Cannot delete — ${count} document(s) reference "${e.name}"`)
      return
    }
    const ok = await confirmDialog({
      title: 'Delete event?',
      message: `"${e.name}" will be permanently deleted.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteEvent(e.id)
      toast.success('Event deleted')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Events</h1>
        <Button onClick={() => setShowAdd(s => !s)}>
          <Plus size={18} className="inline mr-1" />
          {showAdd ? 'Cancel' : 'Add Event'}
        </Button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Events tag a document with the occasion it belongs to (Orientation, Election, Foundation Day, etc.).
        Renaming an event here renames it on every document that uses it.
        An event cannot be deleted while any document still references it.
      </p>

      {showAdd && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New event</h2>
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Name</label>
            <input
              type="text"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder="e.g. Founders Week"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} isLoading={adding}>Save</Button>
            <Button onClick={() => setShowAdd(false)} variant="secondary" disabled={adding}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        {!loading && events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No events yet"
            description="Add one to populate the Event dropdowns in upload and edit forms."
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Name</th>
                <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Documents</th>
                <th className="text-left py-3 px-4 text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => {
                const isEditing = editingId === ev.id
                const docCount = docCountByName.get(ev.name) ?? 0
                return (
                  <tr key={ev.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 text-sm"
                        />
                      ) : (
                        ev.name
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{docCount}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(ev)}
                              disabled={savingEditId === ev.id}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Save"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={savingEditId === ev.id}
                              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(ev)}
                              className="text-yellow-500 hover:text-yellow-700"
                              title="Edit"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(ev)}
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
