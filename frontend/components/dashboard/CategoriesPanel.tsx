'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCategoryStore } from '@/lib/stores/categoryStore'
import { useDocumentStore } from '@/lib/stores/documentStore'
import { toast } from '@/lib/stores/toastStore'
import { confirmDialog } from '@/lib/stores/confirmStore'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Pencil, Trash2, Tag, Plus, X, Check } from 'lucide-react'
import { Category } from '@/types'

export default function CategoriesPanel() {
  const {
    categories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategoryStore()
  const { documents } = useDocumentStore()

  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [savingEditId, setSavingEditId] = useState<string | null>(null)

  useEffect(() => {
    void fetchCategories()
  }, [fetchCategories])

  const docCountByName = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of documents) {
      counts.set(d.category, (counts.get(d.category) ?? 0) + 1)
    }
    return counts
  }, [documents])

  const handleAdd = async () => {
    if (!addName.trim()) return toast.error('Name is required')
    setAdding(true)
    try {
      await createCategory({ name: addName.trim() })
      toast.success('Category added')
      setAddName('')
      setShowAdd(false)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to add category')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (c: Category) => {
    setEditingId(c.id)
    setEditName(c.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const saveEdit = async (c: Category) => {
    if (!editName.trim()) return toast.error('Name is required')
    setSavingEditId(c.id)
    try {
      await updateCategory(c.id, { name: editName.trim() })
      toast.success('Category updated')
      cancelEdit()
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update')
    } finally {
      setSavingEditId(null)
    }
  }

  const handleDelete = async (c: Category) => {
    const count = docCountByName.get(c.name) ?? 0
    if (count > 0) {
      toast.error(`Cannot delete — ${count} document(s) reference "${c.name}"`)
      return
    }
    const ok = await confirmDialog({
      title: 'Delete category?',
      message: `"${c.name}" will be permanently deleted.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteCategory(c.id)
      toast.success('Category deleted')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Categories</h1>
        <Button onClick={() => setShowAdd(s => !s)}>
          <Plus size={18} className="inline mr-1" />
          {showAdd ? 'Cancel' : 'Add Category'}
        </Button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Categories are the document types available in the upload and edit forms.
        Renaming a category here renames it on every document that uses it.
        A category cannot be deleted while any document still references it.
      </p>

      {showAdd && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New category</h2>
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Name</label>
            <input
              type="text"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder="e.g. Memos"
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
        {!loading && categories.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No categories yet"
            description="Add one to populate the Category dropdowns in upload and edit forms."
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
              {categories.map(c => {
                const isEditing = editingId === c.id
                const docCount = docCountByName.get(c.name) ?? 0
                return (
                  <tr key={c.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 text-sm"
                        />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{docCount}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(c)}
                              disabled={savingEditId === c.id}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Save"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={savingEditId === c.id}
                              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(c)}
                              className="text-yellow-500 hover:text-yellow-700"
                              title="Edit"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(c)}
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
