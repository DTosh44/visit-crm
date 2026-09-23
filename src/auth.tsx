/* eslint-disable react-refresh/only-export-components */
import { createClient, type Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { tenant } from './tenant'

export type UserRole = 'Administrator' | 'Membership manager' | 'Content editor' | 'Finance user' | 'Marketing / PR' | 'Travel Trade' | 'Viewer / Reporting'
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
  Administrator: ['dashboard','organisations','people','pipeline','memberships','pages','images','map','listings','events','content','inbox','insights','billing','agreements','tasks','communications','memberValue','memberOpportunities','campaigns','engagement','travelTrade','businessEvents','prMedia','websiteHealth','automations','settings'],
  'Membership manager': ['dashboard','organisations','people','pipeline','memberships','pages','images','map','listings','events','content','inbox','insights','agreements','tasks','communications','memberValue','memberOpportunities','campaigns','engagement','travelTrade','businessEvents','prMedia','websiteHealth'],
  'Content editor': ['dashboard','organisations','people','pages','images','map','listings','events','content','inbox','insights','tasks','campaigns','prMedia','websiteHealth'],
  'Finance user': ['dashboard','organisations','people','billing','tasks','memberValue','campaigns'],
  'Marketing / PR': ['dashboard','organisations','people','tasks','communications','campaigns','memberOpportunities','prMedia','insights','websiteHealth'],
  'Travel Trade': ['dashboard','organisations','people','tasks','communications','memberValue','memberOpportunities','travelTrade','businessEvents','campaigns','insights'],
  'Viewer / Reporting': ['dashboard','organisations','people','memberValue','campaigns','travelTrade','businessEvents','prMedia','insights','websiteHealth'],
}
export function canAccessView(role: UserRole | undefined, view: string) { return role ? roleViews[role].includes(view) : false }

interface AuthContextValue {
  user: WorkspaceUser | null; users: WorkspaceUser[]; loading: boolean; productionAuth: boolean; passwordRecovery: boolean
  signIn: (email: string, password: string) => Promise<string | null>; signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<string | null>; updatePassword: (password: string) => Promise<string | null>
  inviteUser: (input: Pick<WorkspaceUser, 'name' | 'email' | 'role'>) => Promise<string | null>
  updateUser: (id: string, changes: Partial<Pick<WorkspaceUser, 'name' | 'email' | 'role' | 'active'>>) => Promise<string | null>
  removeUser: (id: string) => Promise<string | null>; resetPassword: (id: string) => Promise<string | null>
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
  const [users, setUsers] = useState<WorkspaceUser[]>(() => supabase ? [] : readUsers())
  const [user, setUser] = useState<WorkspaceUser | null>(() => supabase ? null : readLocalUser(readUsers()))
  const [loading, setLoading] = useState(Boolean(supabase))
  const [passwordRecovery,setPasswordRecovery]=useState(()=>Boolean(supabase&&window.location.hash.includes('type=recovery')))
  const refreshUsers=useCallback(async()=>{
    if(!supabase)return null
    const {data,error}=await supabase.from('profiles').select('user_id,email,full_name,role,active,updated_at').eq('tenant_id',tenant.id).order('created_at')
    if(error)return error.message
    setUsers((data??[]).map((profile,index)=>{const name=String(profile.full_name??profile.email?.split('@')[0]??'Workspace user');return{id:String(profile.user_id),email:String(profile.email??''),name,role:profile.role as UserRole,tenantId:tenant.id,initials:name.split(' ').map((part:string)=>part[0]).join('').slice(0,2).toUpperCase(),colour:['#6d294f','#7a9a83','#506f8b','#f0785e'][index%4],active:Boolean(profile.active),lastActive:'Workspace account'}}))
    return null
  },[])
  useEffect(() => { if(!supabase)localStorage.setItem(USERS_KEY, JSON.stringify(users)) }, [users])
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(async({ data }) => { setUser(data.session ? await profileFromSession(data.session) : null);if(data.session)await refreshUsers();setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if(event==='PASSWORD_RECOVERY')setPasswordRecovery(true);if(event==='SIGNED_OUT')setPasswordRecovery(false);void (async()=>{setUser(session ? await profileFromSession(session) : null);if(session)await refreshUsers();setLoading(false)})() })
    return () => data.subscription.unsubscribe()
  }, [refreshUsers])
  const value = useMemo<AuthContextValue>(() => ({
    user, users, loading, productionAuth: Boolean(supabase), passwordRecovery,
    signIn: async (email, password) => {
      if (supabase) { const { error } = await supabase.auth.signInWithPassword({ email, password }); return error?.message ?? null }
      const match = users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase())
      if (!match || password !== DEFAULT_PASSWORD) return 'Check your email address and password, then try again.'
      if (!match.active) return 'This account is suspended. Ask a workspace administrator for access.'
      localStorage.setItem(SESSION_KEY, match.id); setUser(match); return null
    },
    signOut: async () => { if (supabase) await supabase.auth.signOut(); localStorage.removeItem(SESSION_KEY); setUser(null) },
    requestPasswordReset:async(email)=>{if(!supabase)return'Password reset email is available only with production authentication.';const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/crm`});return error?.message??null},
    updatePassword:async(password)=>{if(!supabase)return'Password updates require production authentication.';const {error}=await supabase.auth.updateUser({password});if(!error)setPasswordRecovery(false);return error?.message??null},
    inviteUser: async({ name, email, role }) => {if(!supabase){const tempId=`usr-${Date.now()}`;setUsers((current) => [...current, { id: tempId, name, email, role, tenantId: tenant.id, initials: name.split(' ').map((part) => part[0]).join('').slice(0,2).toUpperCase(), colour: ['#6d294f','#7a9a83','#506f8b','#f0785e'][current.length % 4], active: true, lastActive: 'Invitation sent' }]);return null}const {data,error}=await supabase.functions.invoke('invite-workspace-user',{body:{name,email,role,tenantId:tenant.id}});const failure=error?.message??data?.error;if(failure)return String(failure);return await refreshUsers()},
    updateUser: async(id, changes) => {if(!supabase){setUsers((current) => current.map((item) => item.id === id ? { ...item, ...changes, initials: (changes.name ?? item.name).split(' ').map((part) => part[0]).join('').slice(0,2).toUpperCase() } : item));if(id===user?.id&&changes.active===false)setUser(null);return null}const {data,error}=await supabase.functions.invoke('manage-workspace-user',{body:{action:'update',userId:id,tenantId:tenant.id,changes:{full_name:changes.name,email:changes.email,role:changes.role,active:changes.active}}});const failure=error?.message??data?.error;if(failure)return String(failure);const refreshError=await refreshUsers();if(!refreshError&&id===user?.id){const {data:session}=await supabase.auth.getSession();setUser(session.session?await profileFromSession(session.session):null)}return refreshError},
    removeUser: async(id) => {if(!supabase){setUsers((current) => current.filter((item) => item.id !== id));return null}const {data,error}=await supabase.functions.invoke('manage-workspace-user',{body:{action:'remove',userId:id,tenantId:tenant.id}});const failure=error?.message??data?.error;if(failure)return String(failure);return await refreshUsers()},
    resetPassword: async(id) => {const person=users.find((item)=>item.id===id);if(!person)return'User not found.';if(!supabase){setUsers((current) => current.map((item) => item.id === id ? { ...item, lastActive: 'Password reset sent' } : item));return null}const {error}=await supabase.auth.resetPasswordForEmail(person.email,{redirectTo:`${window.location.origin}/crm`});if(error)return error.message;setUsers((current)=>current.map((item)=>item.id===id?{...item,lastActive:'Password reset sent'}:item));return null},
  }), [loading, passwordRecovery, refreshUsers, user, users])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context }
