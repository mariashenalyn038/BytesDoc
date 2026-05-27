'use client'
import { create } from 'zustand'
import { User } from '@/types'
import { mockUsers } from '@/lib/mockData'
import { apiGetUsers, apiInviteUser, apiUpdateUserRole, apiUpdateUserName, apiRemoveUser } from '@/lib/api'
import { useAuthStore } from './authStore'

interface UserState {
  users: User[]
  loading: boolean
  fetchUsers: () => Promise<void>
  inviteUser: (input: { email: string; fullName: string; role: User['role'] }) => Promise<User>
  updateUserRole: (id: string, role: User['role']) => Promise<void>
  updateUserName: (id: string, name: string) => Promise<void>
  removeUser: (id: string) => Promise<void>
}

export const useUserStore = create<UserState>((set, get) => ({
  users: mockUsers,
  loading: false,

  fetchUsers: async () => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      set({ users: mockUsers })
      return
    }

    set({ loading: true })
    try {
      const users = await apiGetUsers()
      set({ users, loading: false })
    } catch {
      set({ users: [], loading: false })
    }
  },

  inviteUser: async (input) => {
    const { usingMock } = useAuthStore.getState()
    if (usingMock) {
      const fake: User = {
        id: `${Date.now()}`,
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      set(state => ({ users: [...state.users, fake] }))
      return fake
    }

    const newUser = await apiInviteUser({
      email: input.email,
      name: input.fullName,
      role: input.role,
    })
    set(state => ({ users: [...state.users, newUser] }))
    return newUser
  },

  updateUserRole: async (id, role) => {
    const { usingMock } = useAuthStore.getState()
    // Optimistic
    set(state => ({
      users: state.users.map(u => u.id === id ? { ...u, role } : u),
    }))
    if (usingMock) return

    try {
      const updated = await apiUpdateUserRole(id, role)
      set(state => ({
        users: state.users.map(u => u.id === id ? updated : u),
      }))
    } catch {
      await get().fetchUsers()
    }
  },

  updateUserName: async (id, name) => {
    const { usingMock } = useAuthStore.getState()
    // Optimistic
    set(state => ({
      users: state.users.map(u => u.id === id ? { ...u, fullName: name } : u),
    }))
    if (usingMock) return

    try {
      const updated = await apiUpdateUserName(id, name)
      set(state => ({
        users: state.users.map(u => u.id === id ? updated : u),
      }))
    } catch (err) {
      await get().fetchUsers()
      throw err
    }
  },

  removeUser: async (id) => {
    const { usingMock } = useAuthStore.getState()
    // Optimistic removal
    set(state => ({ users: state.users.filter(u => u.id !== id) }))
    if (usingMock) return

    try {
      await apiRemoveUser(id)
    } catch (err) {
      // Roll back on failure
      await get().fetchUsers()
      throw err
    }
  },
}))
