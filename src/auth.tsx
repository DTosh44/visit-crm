/* eslint-disable react-refresh/only-export-components */
import { createClient, type Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { tenant } from './tenant'

export type UserRole = 'Administrator' | 'Membership manager' | 'Content editor' | 'Finance user'
export interface WorkspaceUser { id: string; email: string; name: string; role: UserRole; tenantId: string; initials: string; colour: string; active: boolean; lastActive?: string }

export const seedUsers: WorkspaceUser[] = [
  { id: 'usr-alex', email: 'alex@visitvalechester.co.uk', name: 'Alex Morgan', role: 'Administrator', tenantId: tenant.id, initials: 'AM', colour: '#f0785e', active: true, lastActive: 'Today, 09:42' },
  { id: 'usr-morgan', email: 'morgan@visitvalechester.co.uk', name: 'Morgan Lee', role: 'Membership manager', tenantId: tenant.id, initials: 'ML', colour: '#7a9a83', active: true, lastActive: 'Yesterday, 16:18' },
  { id: 'usr-sam', email: 'sam@visitvalechester.co.uk', name: 'Sam Taylor', role: 'Content editor', tenantId: tenant.id, initials: 'ST', colour: '#ad6c8d', active: true, lastActive: '18 Sep, 14:07' },
  { id: 'usr-jordan', email: 'jordan@visitvalechester.co.uk', name: 'Jordan Ellis', role: 'Finance user', tenantId: tenant.id, initials: 'JE', colour: '#506f8b', active: true, lastActive: '17 Sep, 11:24' },
]

export const DEFAULT_PASSWORD = 'Welcome26!'
const SESSION_KEY = 'visit-valechester-auth-v2'
const USERS_KEY = 'visit-valechester-users-v1'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const roleViews: Record<UserRole, string[]> = {
  Administrator: ['dashboard','organisations','pipeline','memberships','pages','map','listings','events','content','inbox','insights','billing','agreements','tasks','settings'],
  'Membership manager': ['dashboard','organisations','pipeline','memberships','pages','map','listings','events','content','inbox','insights','agreements','tasks'],
  'Content editor': ['dashboard','organisations','pages','map','listings','events','content','inbox','insights','tasks'],
  'Finance user': ['dashboard','organisations','billing','tasks'],
}
export function canAccessView(role: UserRole | undefined, view: string) { return role ? roleViews[role].includes(view) : false }

interface AuthContextValue {
  user: WorkspaceUser | null; users: WorkspaceUser[]; loading: boolean; productionAuth: boolean
  signIn: (email: string, password: string) => Promise<string | null>; signOut: () => Promise<void>
  inviteUser: (input: Pick<WorkspaceUser, 'name' | 'email' | 'role'>) => void
  updateUser: (id: string, changes: Partial<Pick<WorkspaceUser, 'name' | 'email' | 'role' | 'active'>>) => void
  removeUser: (id: string) => void; resetPassword: (id: string) => void
}
const AuthContext = createContext<AuthContextValue | null>(null)
function readUsers() { try { const stored = localStorage.getItem(USERS_KEY); return stored ? JSON.parse(stored) as WorkspaceUser[] : seedUsers } catch { return seedUsers } }
function readLocalUser(users: WorkspaceUser[]) { try { return users.find((item) => item.id === localStorage.getItem(SESSION_KEY) && item.active) ?? null } catch { return null } }
async function profileFromSession(session: Session): Promise<WorkspaceUser|null> {
  if(!supabase)return null
  const {data:profile}=await supabase.from('profiles').select('tenant_id,full_name,role,active').eq('user_id',session.user.id).eq('tenant_id',tenant.id).eq('active',true).maybeSingle()
  if(!profile)return null
  const name=String(profile.full_name??session.user.email?.split('@')[0]??'Workspace user')
  return {id:session.user.id,email:session.user.email??'',name,role:profile.role as UserRole,tenantId:String(profile.tenant_id),initials:name.split(' ').map((part)=>part[0]).join('').slice(0,2).toUpperCase(),colour:tenant.colours.accent,active:true}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<WorkspaceUser[]>(readUsers)
  const [user, setUser] = useState<WorkspaceUser | null>(() => supabase ? null : readLocalUser(readUsers()))
  const [loading, setLoading] = useState(Boolean(supabase))
  useEffect(() => { localStorage.setItem(USERS_KEY, JSON.stringify(users)) }, [users])
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(async({ data }) => { setUser(data.session ? await profileFromSession(data.session) : null); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { void (async()=>{setUser(session ? await profileFromSession(session) : null);setLoading(false)})() })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(()=>{if(!supabase||!user)return;void supabase.from('profiles').select('user_id,email,full_name,role,active,updated_at').eq('tenant_id',tenant.id).then(({data})=>{if(data)setUsers(data.map((profile,index)=>({id:profile.user_id,email:profile.email??'',name:profile.full_name,role:profile.role as UserRole,tenantId:tenant.id,initials:profile.full_name.split(' ').map((part:string)=>part[0]).join('').slice(0,2).toUpperCase(),colour:['#6d294f','#7a9a83','#506f8b','#f0785e'][index%4],active:profile.active,lastActive:'Workspace account'})))})},[user])
  const value = useMemo<AuthContextValue>(() => ({
    user, users, loading, productionAuth: Boolean(supabase),
    signIn: async (email, password) => {
      if (supabase) { const { error } = await supabase.auth.signInWithPassword({ email, password }); return error?.message ?? null }
      const match = users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase())
      if (!match || password !== DEFAULT_PASSWORD) return 'Check your email address and password, then try again.'
      if (!match.active) return 'This account is suspended. Ask a workspace administrator for access.'
      localStorage.setItem(SESSION_KEY, match.id); setUser(match); return null
    },
    signOut: async () => { if (supabase) await supabase.auth.signOut(); localStorage.removeItem(SESSION_KEY); setUser(null) },
    inviteUser: ({ name, email, role }) => {const tempId=`usr-${Date.now()}`;setUsers((current) => [...current, { id: tempId, name, email, role, tenantId: tenant.id, initials: name.split(' ').map((part) => part[0]).join('').slice(0,2).toUpperCase(), colour: ['#6d294f','#7a9a83','#506f8b','#f0785e'][current.length % 4], active: true, lastActive: 'Invitation sent' }]);if(supabase)void supabase.functions.invoke('invite-workspace-user',{body:{name,email,role,tenantId:tenant.id}}).then(({data})=>{if(data?.userId)setUsers((current)=>current.map((item)=>item.id===tempId?{...item,id:data.userId}:item))})},
    updateUser: (id, changes) => {setUsers((current) => current.map((item) => item.id === id ? { ...item, ...changes, initials: (changes.name ?? item.name).split(' ').map((part) => part[0]).join('').slice(0,2).toUpperCase() } : item));if(id===user?.id&&changes.active===false)setUser(null);if(supabase)void supabase.functions.invoke('manage-workspace-user',{body:{action:'update',userId:id,tenantId:tenant.id,changes:{full_name:changes.name,role:changes.role,active:changes.active}}})},
    removeUser: (id) => {setUsers((current) => current.filter((item) => item.id !== id));if(supabase)void supabase.functions.invoke('manage-workspace-user',{body:{action:'remove',userId:id,tenantId:tenant.id}})},
    resetPassword: (id) => {const person=users.find((item)=>item.id===id);setUsers((current) => current.map((item) => item.id === id ? { ...item, lastActive: 'Password reset sent' } : item));if(supabase&&person)void supabase.auth.resetPasswordForEmail(person.email,{redirectTo:`${window.location.origin}/crm`})},
  }), [loading, user, users])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context }
