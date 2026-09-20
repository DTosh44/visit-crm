/* eslint-disable react-refresh/only-export-components */
import { createClient, type Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { tenant } from './tenant'

export type UserRole = 'Administrator' | 'Membership manager' | 'Content editor' | 'Finance user'

export interface WorkspaceUser {
  id: string
  email: string
  name: string
  role: UserRole
  tenantId: string
  initials: string
  colour: string
}

export const demoUsers: WorkspaceUser[] = [
  { id: 'usr-darren', email: 'darren@visitvalechester.demo', name: 'Darren Tosh', role: 'Administrator', tenantId: tenant.id, initials: 'DT', colour: '#f0785e' },
  { id: 'usr-vicki', email: 'vicki@visitvalechester.demo', name: 'Vicki Zamudio', role: 'Membership manager', tenantId: tenant.id, initials: 'VZ', colour: '#7a9a83' },
  { id: 'usr-hannah', email: 'hannah@visitvalechester.demo', name: 'Hannah Ward', role: 'Content editor', tenantId: tenant.id, initials: 'HW', colour: '#ad6c8d' },
  { id: 'usr-finance', email: 'finance@visitvalechester.demo', name: 'Finance Team', role: 'Finance user', tenantId: tenant.id, initials: 'FT', colour: '#506f8b' },
]

export const DEMO_PASSWORD = 'Demo123!'
const STORAGE_KEY = 'visit-valechester-auth-v1'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const roleViews: Record<UserRole, string[]> = {
  Administrator: ['dashboard','organisations','pipeline','memberships','listings','billing','agreements','tasks','settings'],
  'Membership manager': ['dashboard','organisations','pipeline','memberships','listings','agreements','tasks'],
  'Content editor': ['dashboard','organisations','listings','tasks'],
  'Finance user': ['dashboard','organisations','billing','tasks'],
}

export function canAccessView(role: UserRole | undefined, view: string) {
  return role ? roleViews[role].includes(view) : false
}

interface AuthContextValue {
  user: WorkspaceUser | null
  loading: boolean
  productionAuth: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readDemoUser() {
  try {
    const id = localStorage.getItem(STORAGE_KEY)
    return demoUsers.find((item) => item.id === id) ?? null
  } catch {
    return null
  }
}

function profileFromSession(session: Session): WorkspaceUser {
  const metadata = session.user.user_metadata
  const name = String(metadata.full_name ?? session.user.email?.split('@')[0] ?? 'Workspace user')
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name,
    role: (metadata.role as UserRole | undefined) ?? 'Content editor',
    tenantId: String(metadata.tenant_id ?? tenant.id),
    initials: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    colour: tenant.colours.accent,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WorkspaceUser | null>(() => supabase ? null : readDemoUser())
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ? profileFromSession(data.session) : null)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? profileFromSession(session) : null)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    productionAuth: Boolean(supabase),
    signIn: async (email, password) => {
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return error?.message ?? null
      }
      const match = demoUsers.find((item) => item.email.toLowerCase() === email.trim().toLowerCase())
      if (!match || password !== DEMO_PASSWORD) return 'Check the email address and demo password, then try again.'
      localStorage.setItem(STORAGE_KEY, match.id)
      setUser(match)
      return null
    },
    signOut: async () => {
      if (supabase) await supabase.auth.signOut()
      localStorage.removeItem(STORAGE_KEY)
      setUser(null)
    },
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
