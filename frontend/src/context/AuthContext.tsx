import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import apiClient from '../api/client'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: string
  status?: string
  org_id?: string
  org_name?: string
  user_token?: string
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (payload: {
    name: string
    email: string
    password: string
    org_name: string
  }) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setUser(null)
      return
    }
    const { data } = await apiClient.get('/api/auth/me')
    setUser(data as AuthUser)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    refreshMe()
      .catch(() => {
        localStorage.removeItem('access_token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [refreshMe])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post('/api/auth/login', { email, password })
    localStorage.setItem('access_token', data.access_token)
    setUser(data.user as AuthUser)
  }, [])

  const signup = useCallback(
    async (payload: { name: string; email: string; password: string; org_name: string }) => {
      const { data } = await apiClient.post('/api/auth/signup', payload)
      localStorage.setItem('access_token', data.access_token)
      setUser(data.user as AuthUser)
    },
    []
  )

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, refreshMe }),
    [user, loading, login, signup, logout, refreshMe]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
