import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyTenantTheme, tenant } from './tenant'
import './styles.css'

applyTenantTheme()
document.title = window.location.pathname.startsWith('/crm') ? `${tenant.name} CRM` : window.location.pathname.startsWith('/portal') ? `${tenant.name} member portal` : window.location.pathname.startsWith('/survey/') ? `Survey | ${tenant.name}` : `${tenant.name} | ${tenant.strapline}`

const root=createRoot(document.getElementById('root')!)
if(window.location.pathname.startsWith('/portal')){
  if(import.meta.env.PROD&&import.meta.env.VITE_MEMBER_PORTAL_READY!=='true')root.render(<StrictMode><main className="portal-login"><section className="portal-login-card"><h1>Member portal</h1><p>Portal access is not available yet. Please contact your destination team for assistance.</p><a href="/crm">CRM staff sign in</a></section></main></StrictMode>)
  else void import('./SecurePortalApp').then(({SecurePortalApp})=>root.render(<StrictMode><SecurePortalApp/></StrictMode>))
}else{
  void import('./WorkspaceRoot').then(({WorkspaceRoot})=>root.render(<StrictMode><WorkspaceRoot/></StrictMode>))
}
