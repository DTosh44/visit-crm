import { useEffect, useState } from 'react'
import { Layout } from './components/Layout'
import { AddOrganisationModal, AddTaskModal, CreateInvoiceModal } from './components/Forms'
import { ListingEditor } from './components/ListingEditor'
import { OrganisationDrawer } from './components/OrganisationDrawer'
import { useCRM } from './store'
import type { CreateTarget, Listing, Organisation, ViewKey } from './types'
import { Agreements } from './views/Agreements'
import { Billing } from './views/Billing'
import { Dashboard } from './views/Dashboard'
import { Listings } from './views/Listings'
import { Memberships } from './views/Memberships'
import { Organisations } from './views/Organisations'
import { People } from './views/People'
import { Pipeline } from './views/Pipeline'
import { Settings } from './views/Settings'
import { Tasks } from './views/Tasks'
import { Events } from './views/Events'
import { Content } from './views/Content'
import { WebsitePages } from './views/WebsitePages'
import { MapProduct } from './views/MapProduct'
import { ImageBank } from './views/ImageBank'
import { Inbox } from './views/Inbox'
import { Insights } from './views/Insights'
import { supabase, useAuth } from './auth'
import { canAccessView } from './auth'
import { LoginPage } from './LoginPage'
import { PublicSite } from './PublicSite'
import { ProductLogo } from './components/BrandLogo'
import { useFeatures } from './features'
import type { FeatureKey } from './tenant'
import { PublicSurvey } from './PortalApp'
import { SecurePortalApp } from './SecurePortalApp'
import { BusinessEvents, Campaigns, Engagement, MemberOpportunities, PRMedia, TravelTrade, WebsiteHealth } from './views/PlatformModules'
import { MemberValue } from './views/MemberValueManagement'
import { Communications } from './views/Communications'
import { Automations } from './views/Automations'
import { GlobalPlatformCreate, type PlatformCreateTarget } from './components/GlobalPlatformCreate'

const views: ViewKey[] = ['dashboard','organisations','people','pipeline','memberships','pages','images','map','listings','events','content','inbox','insights','billing','agreements','tasks','communications','memberValue','memberOpportunities','campaigns','engagement','travelTrade','businessEvents','prMedia','websiteHealth','automations','settings']
const viewFeatures:Partial<Record<ViewKey,FeatureKey>>={organisations:'organisations',people:'organisations',pipeline:'salesPipeline',memberships:'memberships',pages:'publicWebsite',images:'imageBank',map:'interactiveMap',listings:'listings',events:'events',content:'itineraries',billing:'billing',agreements:'agreements',tasks:'tasks',communications:'communications',memberValue:'memberValue',memberOpportunities:'coopOpportunities',campaigns:'campaigns',engagement:'memberValue',travelTrade:'travelTrade',businessEvents:'businessEvents',prMedia:'prMedia',websiteHealth:'websiteHealth',automations:'automations'}

function initialView(): ViewKey {
  const hash = window.location.hash.replace('#/', '') as ViewKey
  return views.includes(hash) ? hash : 'dashboard'
}

function CRMApp() {
  const { data } = useCRM()
  const { user } = useAuth()
  const { features } = useFeatures()
  const [view, setViewState] = useState<ViewKey>(initialView)
  const [selectedOrganisationId, setSelectedOrganisationId] = useState<string | null>(null)
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [modal, setModal] = useState<'organisation' | 'invoice' | 'task' | null>(null)
  const [createRequest,setCreateRequest]=useState<{target:CreateTarget;token:number}|null>(null)
  const [platformCreate,setPlatformCreate]=useState<PlatformCreateTarget|null>(null)

  useEffect(() => {
    const handleHash = () => setViewState(initialView())
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const setView = (next: ViewKey) => {
    setCreateRequest(null)
    window.location.hash = `/${next}`
    setViewState(next)
  }

  const requiredFeature=viewFeatures[view]
  const featureEnabled=!requiredFeature||features[requiredFeature]
  const activeView=user&&canAccessView(user.role,view)&&featureEnabled?view:'dashboard'

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
  const requestCreate=(target:CreateTarget)=>{
    const platformTargets:PlatformCreateTarget[]=['communication','memberValue','campaign','memberOpportunity','buyer','tradeLead','famTrip','businessEnquiry','prOpportunity']
    if(platformTargets.includes(target as PlatformCreateTarget)){setPlatformCreate(target as PlatformCreateTarget);return}
    if(target==='organisation'||target==='invoice'||target==='task'){setCreateRequest(null);setModal(target);return}
    const destinations:Partial<Record<CreateTarget,ViewKey>>={person:'people',opportunity:'pipeline',membership:'memberships',listing:'listings',event:'events',content:'content',page:'pages',image:'images',agreement:'agreements'}
    setView(destinations[target]??'dashboard')
    setCreateRequest({target,token:Date.now()})
  }

  return (
    <Layout
      view={activeView}
      setView={setView}
      onCreate={requestCreate}
      onOpenOrganisation={openOrganisation}
      onOpenListing={openListing}
    >
      {activeView === 'dashboard' && <Dashboard navigate={setView} openOrganisation={openOrganisation} />}
      {activeView === 'organisations' && <Organisations onAdd={() => setModal('organisation')} onOpen={openOrganisation} />}
      {activeView === 'people' && <People key={createRequest?.target==='person'?createRequest.token:0} createRequest={createRequest?.target==='person'?createRequest.token:0} />}
      {activeView === 'pipeline' && <Pipeline key={createRequest?.target==='opportunity'?createRequest.token:0} createRequest={createRequest?.target==='opportunity'?createRequest.token:0} />}
      {activeView === 'memberships' && <Memberships key={createRequest?.target==='membership'?createRequest.token:0} openOrganisation={openOrganisation} createRequest={createRequest?.target==='membership'?createRequest.token:0} />}
      {activeView === 'listings' && <Listings key={createRequest?.target==='listing'?createRequest.token:0} onEdit={openListing} createRequest={createRequest?.target==='listing'?createRequest.token:0} />}
      {activeView === 'events' && <Events key={createRequest?.target==='event'?createRequest.token:0} createRequest={createRequest?.target==='event'?createRequest.token:0} />}
      {activeView === 'pages' && <WebsitePages key={createRequest?.target==='page'?createRequest.token:0} createRequest={createRequest?.target==='page'?createRequest.token:0} />}
      {activeView === 'images' && <ImageBank key={createRequest?.target==='image'?createRequest.token:0} createRequest={createRequest?.target==='image'?createRequest.token:0} />}
      {activeView === 'map' && <MapProduct />}
      {activeView === 'content' && <Content key={createRequest?.target==='content'?createRequest.token:0} createRequest={createRequest?.target==='content'?createRequest.token:0} />}
      {activeView === 'inbox' && <Inbox />}
      {activeView === 'insights' && <Insights />}
      {activeView === 'billing' && <Billing onCreate={() => setModal('invoice')} />}
      {activeView === 'agreements' && <Agreements key={createRequest?.target==='agreement'?createRequest.token:0} createRequest={createRequest?.target==='agreement'?createRequest.token:0} />}
      {activeView === 'tasks' && <Tasks onAdd={() => setModal('task')} openOrganisation={openOrganisation} />}
      {activeView === 'communications' && <Communications />}
      {activeView === 'memberValue' && <MemberValue />}
      {activeView === 'memberOpportunities' && <MemberOpportunities onNavigateCommunications={()=>setView('communications')} />}
      {activeView === 'campaigns' && <Campaigns />}
      {activeView === 'engagement' && <Engagement />}
      {activeView === 'travelTrade' && <TravelTrade onNavigateCommunications={()=>setView('communications')} onNavigateMemberOpportunities={()=>setView('memberOpportunities')} />}
      {activeView === 'businessEvents' && <BusinessEvents onNavigateCommunications={()=>setView('communications')} />}
      {activeView === 'prMedia' && <PRMedia />}
      {activeView === 'websiteHealth' && <WebsiteHealth navigate={setView} />}
      {activeView === 'automations' && <Automations />}
      {activeView === 'settings' && <Settings />}

      {selectedOrganisation && <OrganisationDrawer key={selectedOrganisation.id} organisation={selectedOrganisation} onClose={() => setSelectedOrganisationId(null)} onEditListing={openListing} />}
      {selectedListing && <ListingEditor listing={selectedListing} onClose={() => setSelectedListingId(null)} />}
      {modal === 'organisation' && <AddOrganisationModal onClose={() => setModal(null)} onCreated={openOrganisation} />}
      {modal === 'invoice' && <CreateInvoiceModal onClose={() => setModal(null)} />}
      {modal === 'task' && <AddTaskModal onClose={() => setModal(null)} />}
      {platformCreate && <GlobalPlatformCreate target={platformCreate} onClose={()=>setPlatformCreate(null)} navigate={setView}/>}
    </Layout>
  )
}

export default function App() {
  const { user, loading, passwordRecovery } = useAuth()
  const { ready, saveError } = useCRM()
  const isCRM = window.location.pathname.startsWith('/crm')
  const isPortal = window.location.pathname.startsWith('/portal')
  const surveySlug = window.location.pathname.match(/^\/survey\/([^/]+)/)?.[1]

  if (import.meta.env.PROD && !supabase && import.meta.env.VITE_DEMO_MODE !== 'true') return <main className="portal-login"><section className="portal-login-card"><ProductLogo/><h1>Configuration required</h1><p>This deployment has no shared database or production authentication. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before customer use.</p><small>Browser-only sample data is disabled in production. Set VITE_DEMO_MODE=true only for an explicitly labelled demonstration deployment.</small></section></main>

  if (surveySlug) return <PublicSurvey slug={decodeURIComponent(surveySlug)} />
  if (isPortal) return <SecurePortalApp />
  if (!isCRM) return supabase&&!ready?<div className="auth-loading"><ProductLogo /><span>{saveError ?? 'Loading destination listings and events…'}</span>{saveError&&<button onClick={()=>window.location.reload()}>Try again</button>}</div>:<PublicSite />
  if (loading) return <div className="auth-loading"><ProductLogo /><span>Opening your workspace…</span></div>
  if (passwordRecovery) return <LoginPage />
  if (!user) return <LoginPage />
  if (!ready) return <div className="auth-loading"><ProductLogo /><span>{saveError ?? 'Loading your workspace records…'}</span>{saveError&&<button onClick={()=>window.location.reload()}>Try again</button>}</div>
  return <CRMApp />
}
