import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyTenantTheme, tenant } from './tenant'
import './styles.css'

applyTenantTheme()
document.title = window.location.pathname.startsWith('/crm') ? `${tenant.name} CRM` : window.location.pathname.startsWith('/portal') ? `${tenant.name} member portal` : window.location.pathname.startsWith('/survey/') ? `Survey | ${tenant.name}` : `${tenant.name} | ${tenant.strapline}`

const root=createRoot(document.getElementById('root')!)
if(window.location.pathname.startsWith('/portal')){
  void import('./SecurePortalApp').then(({SecurePortalApp})=>root.render(<StrictMode><SecurePortalApp/></StrictMode>))
}else{
  void import('./WorkspaceRoot').then(({WorkspaceRoot})=>root.render(<StrictMode><WorkspaceRoot/></StrictMode>))
}
