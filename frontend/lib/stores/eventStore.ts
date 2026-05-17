'use client'
import { create } from 'zustand'
import { Event } from '@/types'
import { mockEvents } from '@/lib/mockData'
import {
  apiListEvents,
  apiCreateEvent,
  apiUpdateEvent,
  apiDeleteEvent,
} from '@/lib/api'
import { useAuthStore } from './authStore'

function mockSeed(): Event[] {
  return mockEvents.map((name, i) => ({
    id: `mock-event-${i}`,
    name,
    createdAt: new Date().toISOString(),
  }))
}

interface EventState {
  events: Event[]
  loading: boolean
  loaded: boolean
  fetchEvents: () => Promise<void>
  ensureLoaded: () => Promise<void>
  createEvent: (input: { name: string }) => Promise<Event>
  updateEvent: (id: string, patch: { name: string }) => Promise<Event>
  deleteEvent: (id: string) => Promise<void>
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  loading: false,
  loaded: false,

  fetchEvents: async () => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      set({ events: mockSeed(), loaded: true })
      return
    }
    set({ loading: true })
    try {
      const list = await apiListEvents()
      set({ events: list, loading: false, loaded: true })
    } catch {
      set({ events: mockSeed(), loading: false, loaded: true })
    }
  },

  ensureLoaded: async () => {
    if (get().loaded || get().loading) return
    await get().fetchEvents()
  },

  createEvent: async (input) => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      const created: Event = {
        id: `mock-event-${Date.now()}`,
        name: input.name,
        createdAt: new Date().toISOString(),
      }
      set(state => ({ events: [...state.events, created].sort((a, b) => a.name.localeCompare(b.name)) }))
      return created
    }
    const created = await apiCreateEvent(input)
    set(state => ({ events: [...state.events, created].sort((a, b) => a.name.localeCompare(b.name)) }))
    return created
  },

  updateEvent: async (id, patch) => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      let updated: Event | undefined
      set(state => ({
        events: state.events
          .map(e => {
            if (e.id !== id) return e
            updated = { ...e, name: patch.name }
            return updated
          })
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      return updated!
    }
    const updated = await apiUpdateEvent(id, patch)
    set(state => ({
      events: state.events
        .map(e => (e.id === id ? updated : e))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    return updated
  },

  deleteEvent: async (id) => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      set(state => ({ events: state.events.filter(e => e.id !== id) }))
      return
    }
    await apiDeleteEvent(id)
    set(state => ({ events: state.events.filter(e => e.id !== id) }))
  },
}))
