import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { CRMProvider } from './store'
import { AuthProvider } from './auth'
import { FeatureProvider } from './features'
import { applyTenantTheme, tenant } from './tenant'
import './styles.css'

applyTenantTheme()
document.title = window.location.pathname.startsWith('/crm') ? `${tenant.name} CRM` : `${tenant.name} | ${tenant.strapline}`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <FeatureProvider>
        <CRMProvider>
          <App />
        </CRMProvider>
      </FeatureProvider>
    </AuthProvider>
  </StrictMode>,
)
