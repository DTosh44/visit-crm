import { useEffect, useState } from 'react'
import { Layout } from './components/Layout'
import { AddOrganisationModal, AddTaskModal, CreateInvoiceModal } from './components/Forms'
import { ListingEditor } from './components/ListingEditor'
import { OrganisationDrawer } from './components/OrganisationDrawer'
import { useCRM } from './store'
import type { Listing, Organisation, ViewKey } from './types'
import { Agreements } from './views/Agreements'
import { Billing } from './views/Billing'
import { Dashboard } from './views/Dashboard'
import { Listings } from './views/Listings'
import { Memberships } from './views/Memberships'
import { Organisations } from './views/Organisations'
import { Pipeline } from './views/Pipeline'
import { Settings } from './views/Settings'
import { Tasks } from './views/Tasks'
import { Events } from './views/Events'
import { useAuth } from './auth'
import { canAccessView } from './auth'
import { LoginPage } from './LoginPage'
import { PublicSite } from './PublicSite'
import { BrandLogo } from './components/BrandLogo'

const views: ViewKey[] = ['dashboard','organisations','pipeline','memberships','listings','events','billing','agreements','tasks','settings']

function initialView(): ViewKey {
  const hash = window.location.hash.replace('#/', '') as ViewKey
  return views.includes(hash) ? hash : 'dashboard'
}

function CRMApp() {
  const { data } = useCRM()
  const { user } = useAuth()
  const [view, setViewState] = useState<ViewKey>(initialView)
  const [selectedOrganisationId, setSelectedOrganisationId] = useState<string | null>(null)
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [modal, setModal] = useState<'organisation' | 'invoice' | 'task' | null>(null)

  useEffect(() => {
    const handleHash = () => setViewState(initialView())
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const setView = (next: ViewKey) => {
    window.location.hash = `/${next}`
    setViewState(next)
  }

  const activeView=user&&canAccessView(user.role,view)?view:'dashboard'

  const openOrganisation = (organisation: Organisation) => {
    setSelectedListingId(null)
    setSelectedOrganisationId(organisation.id)
  }
  const openListing = (listing: Listing) => {
    setSelectedOrganisationId(null)
    setSelectedListingId(listing.id)
  }
  const selectedOrganisation = data.organisations.find((item) => item.id === selectedOrganisationId)
  const selectedListing = data.listings.find((item) => item.id === selectedListingId)

  return (
    <Layout
      view={activeView}
      setView={setView}
      onAddOrganisation={() => setModal('organisation')}
      onAddInvoice={() => setModal('invoice')}
      onAddTask={() => setModal('task')}
      onOpenOrganisation={openOrganisation}
    >
      {activeView === 'dashboard' && <Dashboard navigate={setView} openOrganisation={openOrganisation} />}
      {activeView === 'organisations' && <Organisations onAdd={() => setModal('organisation')} onOpen={openOrganisation} />}
      {activeView === 'pipeline' && <Pipeline />}
      {activeView === 'memberships' && <Memberships openOrganisation={openOrganisation} />}
      {activeView === 'listings' && <Listings onEdit={openListing} />}
      {activeView === 'events' && <Events />}
      {activeView === 'billing' && <Billing onCreate={() => setModal('invoice')} />}
      {activeView === 'agreements' && <Agreements />}
      {activeView === 'tasks' && <Tasks onAdd={() => setModal('task')} openOrganisation={openOrganisation} />}
      {activeView === 'settings' && <Settings />}

      {selectedOrganisation && <OrganisationDrawer key={selectedOrganisation.id} organisation={selectedOrganisation} onClose={() => setSelectedOrganisationId(null)} onEditListing={openListing} />}
      {selectedListing && <ListingEditor listing={selectedListing} onClose={() => setSelectedListingId(null)} />}
      {modal === 'organisation' && <AddOrganisationModal onClose={() => setModal(null)} onCreated={openOrganisation} />}
      {modal === 'invoice' && <CreateInvoiceModal onClose={() => setModal(null)} />}
      {modal === 'task' && <AddTaskModal onClose={() => setModal(null)} />}
    </Layout>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const isCRM = window.location.pathname.startsWith('/crm')

  if (!isCRM) return <PublicSite />
  if (loading) return <div className="auth-loading"><BrandLogo /><span>Opening your workspace…</span></div>
  if (!user) return <LoginPage />
  return <CRMApp />
}
