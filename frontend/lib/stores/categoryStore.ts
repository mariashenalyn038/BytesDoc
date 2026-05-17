'use client'
import { create } from 'zustand'
import { Category } from '@/types'
import { mockCategories } from '@/lib/mockData'
import {
  apiListCategories,
  apiCreateCategory,
  apiUpdateCategory,
  apiDeleteCategory,
} from '@/lib/api'
import { useAuthStore } from './authStore'

function mockSeed(): Category[] {
  return mockCategories.map((name, i) => ({
    id: `mock-cat-${i}`,
    name,
    createdAt: new Date().toISOString(),
  }))
}

interface CategoryState {
  categories: Category[]
  loading: boolean
  loaded: boolean
  fetchCategories: () => Promise<void>
  ensureLoaded: () => Promise<void>
  createCategory: (input: { name: string }) => Promise<Category>
  updateCategory: (id: string, patch: { name: string }) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  loaded: false,

  fetchCategories: async () => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      set({ categories: mockSeed(), loaded: true })
      return
    }
    set({ loading: true })
    try {
      const list = await apiListCategories()
      set({ categories: list, loading: false, loaded: true })
    } catch {
      set({ categories: mockSeed(), loading: false, loaded: true })
    }
  },

  ensureLoaded: async () => {
    if (get().loaded || get().loading) return
    await get().fetchCategories()
  },

  createCategory: async (input) => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      const created: Category = {
        id: `mock-cat-${Date.now()}`,
        name: input.name,
        createdAt: new Date().toISOString(),
      }
      set(state => ({ categories: [...state.categories, created].sort((a, b) => a.name.localeCompare(b.name)) }))
      return created
    }
    const created = await apiCreateCategory(input)
    set(state => ({ categories: [...state.categories, created].sort((a, b) => a.name.localeCompare(b.name)) }))
    return created
  },

  updateCategory: async (id, patch) => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      let updated: Category | undefined
      set(state => ({
        categories: state.categories
          .map(c => {
            if (c.id !== id) return c
            updated = { ...c, name: patch.name }
            return updated
          })
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      return updated!
    }
    const updated = await apiUpdateCategory(id, patch)
    set(state => ({
      categories: state.categories
        .map(c => (c.id === id ? updated : c))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    return updated
  },

  deleteCategory: async (id) => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      set(state => ({ categories: state.categories.filter(c => c.id !== id) }))
      return
    }
    await apiDeleteCategory(id)
    set(state => ({ categories: state.categories.filter(c => c.id !== id) }))
  },
}))
