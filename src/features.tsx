/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultFeatures, tenant, type FeatureKey } from './tenant'
import { supabase } from './auth'

const STORAGE_KEY = 'visit-valechester-features-v1'

interface FeatureContextValue {
  features: Record<FeatureKey, boolean>
  setFeature: (feature: FeatureKey, enabled: boolean) => void
  resetFeatures: () => void
}

const FeatureContext = createContext<FeatureContextValue | null>(null)

function initialFeatures() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...defaultFeatures, ...JSON.parse(saved) as Partial<Record<FeatureKey, boolean>> } : defaultFeatures
  } catch {
    return defaultFeatures
  }
}

export function FeatureProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(initialFeatures)
  useEffect(()=>{if(!supabase)return;void supabase.from('tenants').select('features').eq('id',tenant.id).maybeSingle().then(({data})=>{if(data?.features)setFeatures({...defaultFeatures,...data.features as Partial<Record<FeatureKey,boolean>>})})},[])
  const value = useMemo<FeatureContextValue>(() => ({
    features,
    setFeature: (feature, enabled) => {
      setFeatures((current) => {
        const next = { ...current, [feature]: enabled }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        if(supabase)void supabase.from('tenants').update({features:next,updated_at:new Date().toISOString()}).eq('id',tenant.id)
        return next
      })
    },
    resetFeatures: () => {
      localStorage.removeItem(STORAGE_KEY)
      setFeatures(defaultFeatures)
      if(supabase)void supabase.from('tenants').update({features:defaultFeatures,updated_at:new Date().toISOString()}).eq('id',tenant.id)
    },
  }), [features])

  return <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>
}

export function useFeatures() {
  const context = useContext(FeatureContext)
  if (!context) throw new Error('useFeatures must be used inside FeatureProvider')
  return context
}
