/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultFeatures, tenant, type FeatureKey } from './tenant'
import { supabase } from './auth'

// Major platform releases use a fresh local key so newly introduced modules are
// visible in the demo instead of inheriting stale development-only switches.
const STORAGE_KEY = 'visit-valechester-features-v2'

interface FeatureContextValue {
  features: Record<FeatureKey, boolean>
  available: (feature: FeatureKey) => boolean
  setFeature: (feature: FeatureKey, enabled: boolean) => void
  resetFeatures: () => void
}

const FeatureContext = createContext<FeatureContextValue | null>(null)

const productionServiceFlags:Partial<Record<FeatureKey,boolean>>={
  memberPortal:import.meta.env.VITE_MEMBER_PORTAL_READY==='true',
  communications:import.meta.env.VITE_COMMUNICATIONS_READY==='true',
  automations:import.meta.env.VITE_AUTOMATIONS_READY==='true',
  aiAssistant:import.meta.env.VITE_AI_READY==='true',
  aiWebsiteEditor:import.meta.env.VITE_AI_READY==='true',
}
function serviceAvailable(feature:FeatureKey){return !supabase||productionServiceFlags[feature]!==false}
function onlyAvailable(features:Record<FeatureKey,boolean>){return Object.fromEntries(Object.entries(features).map(([key,enabled])=>[key,enabled&&serviceAvailable(key as FeatureKey)])) as Record<FeatureKey,boolean>}

function initialFeatures() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return onlyAvailable(saved ? { ...defaultFeatures, ...JSON.parse(saved) as Partial<Record<FeatureKey, boolean>> } : defaultFeatures)
  } catch {
    return onlyAvailable(defaultFeatures)
  }
}

export function FeatureProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(initialFeatures)
  useEffect(()=>{if(!supabase)return;void supabase.from('tenants').select('features').eq('id',tenant.id).maybeSingle().then(({data})=>{if(data?.features)setFeatures(onlyAvailable({...defaultFeatures,...data.features as Partial<Record<FeatureKey,boolean>>}))})},[])
  const value = useMemo<FeatureContextValue>(() => ({
    features,
    available:serviceAvailable,
    setFeature: (feature, enabled) => {
      if(enabled&&!serviceAvailable(feature))return
      setFeatures((current) => {
        const next = { ...current, [feature]: enabled }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        if(supabase)void supabase.from('tenants').update({features:next,updated_at:new Date().toISOString()}).eq('id',tenant.id)
        return next
      })
    },
    resetFeatures: () => {
      localStorage.removeItem(STORAGE_KEY)
      const next=onlyAvailable(defaultFeatures)
      setFeatures(next)
      if(supabase)void supabase.from('tenants').update({features:next,updated_at:new Date().toISOString()}).eq('id',tenant.id)
    },
  }), [features])

  return <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>
}

export function useFeatures() {
  const context = useContext(FeatureContext)
  if (!context) throw new Error('useFeatures must be used inside FeatureProvider')
  return context
}
