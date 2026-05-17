'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { useActivityStore } from '@/lib/stores/activityStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const addLog = useActivityStore((state) => state.addLog)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const success = login(email, password)
    
    if (success) {
      const user = useAuthStore.getState().user
      if (user) {
        addLog({ userId: user.id, action: 'login' })
        
        // Redirect based on role
        const roleRoutes = {
          chief_minister: '/dashboard/admin',
          secretary: '/dashboard/secretary',
          finance_minister: '/dashboard/finance',
          member: '/dashboard/member',
        }
        router.push(roleRoutes[user.role])
      }
    } else {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-primary dark:text-white mb-6 text-center">
          BytesDoc Login
        </h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded-lg hover:bg-accent transition font-semibold"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}
``
