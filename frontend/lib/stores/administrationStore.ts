'use client'
import { create } from 'zustand'
import { Administration } from '@/types'
import { mockAdministrations } from '@/lib/mockData'
import {
  apiListAdministrations,
  apiCreateAdministration,
  apiUpdateAdministration,
  apiDeleteAdministration,
} from '@/lib/api'
import { useAuthStore } from './authStore'

function mockSeed(): Administration[] {
  return mockAdministrations.map((name, i) => ({
    id: `mock-${i}`,
    name,
    startDate: '2024-01-01',
    endDate: null,
    createdAt: new Date().toISOString(),
  }))
}

interface AdministrationState {
  administrations: Administration[]
  loading: boolean
  loaded: boolean
  fetchAdministrations: () => Promise<void>
  ensureLoaded: () => Promise<void>
  createAdministration: (input: { name: string; startDate: string; endDate?: string | null }) => Promise<Administration>
  updateAdministration: (id: string, patch: { name?: string; startDate?: string; endDate?: string | null }) => Promise<Administration>
  deleteAdministration: (id: string) => Promise<void>
}

export const useAdministrationStore = create<AdministrationState>((set, get) => ({
  administrations: [],
  loading: false,
  loaded: false,

  fetchAdministrations: async () => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      set({ administrations: mockSeed(), loaded: true })
      return
    }
    set({ loading: true })
    try {
      const list = await apiListAdministrations()
      set({ administrations: list, loading: false, loaded: true })
    } catch {
      set({ administrations: mockSeed(), loading: false, loaded: true })
    }
  },

  ensureLoaded: async () => {
    if (get().loaded || get().loading) return
    await get().fetchAdministrations()
  },

  createAdministration: async (input) => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      const created: Administration = {
        id: `mock-${Date.now()}`,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        createdAt: new Date().toISOString(),
      }
      set(state => ({ administrations: [created, ...state.administrations] }))
      return created
    }
    const created = await apiCreateAdministration(input)
    set(state => ({ administrations: [created, ...state.administrations] }))
    return created
  },

  updateAdministration: async (id, patch) => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      let updated: Administration | undefined
      set(state => ({
        administrations: state.administrations.map(a => {
          if (a.id !== id) return a
          updated = {
            ...a,
            name: patch.name ?? a.name,
            startDate: patch.startDate ?? a.startDate,
            endDate: patch.endDate === undefined ? a.endDate : patch.endDate,
          }
          return updated
        }),
      }))
      return updated!
    }
    const updated = await apiUpdateAdministration(id, patch)
    set(state => ({
      administrations: state.administrations.map(a => (a.id === id ? updated : a)),
    }))
    return updated
  },

  deleteAdministration: async (id) => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      set(state => ({ administrations: state.administrations.filter(a => a.id !== id) }))
      return
    }
    await apiDeleteAdministration(id)
    set(state => ({ administrations: state.administrations.filter(a => a.id !== id) }))
  },
}))
