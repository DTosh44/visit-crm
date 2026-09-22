import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { CRMProvider } from './store'
import { AuthProvider } from './auth'
import { FeatureProvider } from './features'
import { applyTenantTheme, tenant } from './tenant'
import { PlatformProvider } from './platform'
import './styles.css'

applyTenantTheme()
document.title = window.location.pathname.startsWith('/crm') ? `${tenant.name} CRM` : window.location.pathname.startsWith('/portal') ? `${tenant.name} member portal` : window.location.pathname.startsWith('/survey/') ? `Survey | ${tenant.name}` : `${tenant.name} | ${tenant.strapline}`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <FeatureProvider>
        <CRMProvider>
          <PlatformProvider><App /></PlatformProvider>
        </CRMProvider>
      </FeatureProvider>
    </AuthProvider>
  </StrictMode>,
)
