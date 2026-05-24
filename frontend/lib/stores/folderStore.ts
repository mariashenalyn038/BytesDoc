'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Folder {
  id: string
  name: string
  category: string        // Sub-category (e.g., 'Budget Proposal', 'Liquidation', 'Proposals')
  parentCategory: string  // Department (e.g., 'Finance', 'Secretary', 'MOPI', 'Judiciary', 'Election', 'Event')
  administration: string  // Administration name (e.g., '2024-2025')
  createdAt: string
}

interface FolderState {
  folders: Folder[]
  documentFolders: Record<string, string> // maps documentId -> folderId
  addFolder: (name: string, category: string, parentCategory: string, administration: string) => Folder
  deleteFolder: (id: string) => void
  assignDocumentToFolder: (documentId: string, folderId: string | null) => void
}

export const useFolderStore = create<FolderState>()(
  persist(
    (set) => ({
      folders: [],
      documentFolders: {},
      addFolder: (name, category, parentCategory, administration) => {
        const newFolder: Folder = {
          id: `folder-${Date.now()}`,
          name: name.trim(),
          category,
          parentCategory,
          administration,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ folders: [...state.folders, newFolder] }))
        return newFolder
      },
      deleteFolder: (id) => {
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          documentFolders: Object.fromEntries(
            Object.entries(state.documentFolders).filter(([_, fId]) => fId !== id)
          ),
        }))
      },
      assignDocumentToFolder: (documentId, folderId) => {
        set((state) => {
          const next = { ...state.documentFolders }
          if (folderId === null) {
            delete next[documentId]
          } else {
            next[documentId] = folderId
          }
          return { documentFolders: next }
        })
      },
    }),
    {
      name: 'bytesdoc-folders',
    }
  )
)
