import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { CRMProvider } from './store'
import { AuthProvider } from './auth'
import { FeatureProvider } from './features'
import { initialData } from './data'
import { PlatformProvider } from './platform'
import { initialPlatformData } from './platformData'
import { tenant } from './tenant'
import { SecurePortalApp } from './SecurePortalApp'

function renderApp() {
  return render(<AuthProvider><FeatureProvider><CRMProvider><PlatformProvider><App /></PlatformProvider></CRMProvider></FeatureProvider></AuthProvider>)
}

describe('Visit CRM', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('visit-valechester-auth-v2', 'usr-alex')
    window.history.pushState({}, '', '/crm')
    window.location.hash = ''
  })

  it('renders the destination dashboard', () => {
    renderApp()
    expect(screen.getByRole('img',{name:'VisitMade'})).toBeInTheDocument()
    expect(screen.getByRole('img',{name:'Visit Valechester'})).toBeInTheDocument()
    expect(screen.getByText(/Good (morning|afternoon|evening), Alex/)).toBeInTheDocument()
    expect(screen.getByText('Membership income')).toBeInTheDocument()
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
    expect(screen.getByText('Members by level')).toBeInTheDocument()
    expect(screen.getByText('Visitor review trends')).toBeInTheDocument()
    expect(screen.getByText('5.8m')).toBeInTheDocument()
  })

  it('saves a communication draft without claiming it was sent', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Communications'}))
    expect(screen.getByText('No communications yet')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'New communication'}))
    fireEvent.change(screen.getByLabelText('Internal name'),{target:{value:'Autumn update'}})
    fireEvent.change(screen.getByLabelText('Subject'),{target:{value:'A destination update'}})
    fireEvent.change(screen.getByLabelText(/Rich text content/),{target:{value:'Hello {{first_name}}'}})
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}))
    expect(screen.getByText('A destination update')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('creates an automation and runs it once for a new organisation', async () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Automations'}))
    expect(screen.getByText('No automations yet')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'New automation'}))
    fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Welcome a new partner'}})
    fireEvent.change(screen.getByLabelText('Description'),{target:{value:'Create a welcome task for each new organisation.'}})
    fireEvent.change(screen.getByLabelText('Action 1 value'),{target:{value:'Call new partner'}})
    fireEvent.click(screen.getByLabelText('Active after saving'))
    fireEvent.click(screen.getByRole('button',{name:'Create automation'}))
    expect(screen.getByText('Welcome a new partner')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Organisations'}))
    fireEvent.click(screen.getByRole('button',{name:'Add organisation'}))
    fireEvent.change(screen.getByLabelText('Organisation name'),{target:{value:'Automation Test Partner'}})
    fireEvent.click(screen.getByRole('button',{name:'Create organisation'}))
    fireEvent.click(screen.getByRole('button',{name:/^Tasks,/}))
    await waitFor(()=>expect(screen.getByText('Call new partner')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button',{name:'Automations'}))
    fireEvent.click(screen.getByRole('tab',{name:'History'}))
    expect(screen.getAllByText('Automation Test Partner').length).toBeGreaterThan(0)
    expect(screen.getByText('Create task: Call new partner')).toBeInTheDocument()
    fireEvent.focus(window)
    expect(screen.getAllByText('Create task: Call new partner')).toHaveLength(1)
  })

  it('runs a due scheduled automation once despite repeated focus checks', async () => {
    localStorage.setItem(`visitmade-platform-v2-${tenant.id}`,JSON.stringify({...initialPlatformData,automations:[{id:'auto-scheduled-test',name:'Scheduled partner check',description:'Review major attractions.',trigger:'date_based',conditions:[{field:'tags',operator:'contains',value:'Major attraction'}],actions:[{type:'create_task',value:'Review castle partnership'}],active:true,createdAt:new Date().toISOString(),owner:'Alex Morgan',scheduleAt:new Date(Date.now()-3600000).toISOString(),runs:0}]}))
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Automations'}))
    fireEvent.click(screen.getByRole('tab',{name:'History'}))
    await waitFor(()=>expect(screen.getByText('Create task: Review castle partnership')).toBeInTheDocument())
    fireEvent.focus(window)
    fireEvent.focus(window)
    expect(screen.getAllByText('Create task: Review castle partnership')).toHaveLength(1)
  })

  it('navigates to the organisations workspace', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Organisations' }))
    expect(screen.getByRole('heading', { name: 'Organisations' })).toBeInTheDocument()
    expect(screen.getByText('Valechester Castle')).toBeInTheDocument()
  })

  it('manages organisation-linked and independent people with tags', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'People'}))
    expect(screen.getByRole('heading',{name:'People'})).toBeInTheDocument()
    expect(screen.getByText('Amelia Grant')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Add person'}))
    fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Priya Nair'}})
    fireEvent.change(screen.getByLabelText('Job title'),{target:{value:'Inbound product manager'}})
    fireEvent.change(screen.getByLabelText('Email'),{target:{value:'priya@example.com'}})
    const tagInput=screen.getByLabelText('Add tags')
    fireEvent.change(tagInput,{target:{value:'International'}})
    fireEvent.keyDown(tagInput,{key:'Enter'})
    fireEvent.click(screen.getByRole('button',{name:'Save person'}))
    expect(screen.getByText('Priya Nair')).toBeInTheDocument()
    expect(screen.getAllByText('Independent').length).toBeGreaterThan(0)
    expect(screen.getAllByText('International').length).toBeGreaterThan(0)
  })

  it('adds searchable tags to an organisation', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Organisations'}))
    fireEvent.click(screen.getByRole('button',{name:'Valechester Castle'}))
    fireEvent.click(screen.getByRole('button',{name:'Manage tags'}))
    const input=screen.getByLabelText('Add tags')
    fireEvent.change(input,{target:{value:'Press trip host'}})
    fireEvent.keyDown(input,{key:'Enter'})
    fireEvent.click(screen.getByRole('button',{name:'Save tags'}))
    expect(screen.getByText('Press trip host')).toBeInTheDocument()
  })

  it('adds an organisation without creating a membership', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Organisations'}))
    fireEvent.click(screen.getByRole('button',{name:'Add organisation'}))
    fireEvent.change(screen.getByLabelText('Organisation name'),{target:{value:'Valechester PR Collective'}})
    expect(screen.getByLabelText('Membership level')).toHaveValue('No membership')
    expect(screen.getByLabelText('Relationship status')).toHaveValue('Non-member')
    fireEvent.click(screen.getByRole('button',{name:'Create organisation'}))
    expect(screen.getByRole('button',{name:'Valechester PR Collective'})).toBeInTheDocument()
    expect(screen.getAllByText('Non-member').length).toBeGreaterThan(0)
  })

  it('offers CRM-wide record types from Add new', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Add new'}))
    const menu=within(screen.getByRole('region',{name:'Quick create'}))
    for(const name of ['Organisation','Person','Opportunity','Task','Membership level','Invoice','Agreement','Listing','Event','Guide, itinerary or trail','Website page','Image','A/B test'])expect(menu.getByRole('button',{name:new RegExp(`^${name}`)})).toBeInTheDocument()
    fireEvent.click(menu.getByRole('button',{name:/^Person/}))
    expect(screen.getByRole('heading',{name:'People'})).toBeInTheDocument()
    expect(screen.getByRole('heading',{name:'Add person'})).toBeInTheDocument()
  })

  it('searches records across the whole CRM', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:/Search the CRM/}))
    const search=screen.getByLabelText('Search the whole CRM')
    fireEvent.change(search,{target:{value:'VV-2026-1048'}})
    expect(screen.getByRole('button',{name:/VV-2026-1048.*Invoice/})).toBeInTheDocument()
    fireEvent.change(search,{target:{value:'Amelia Grant'}})
    expect(screen.getByRole('button',{name:/Amelia Grant.*Person/})).toBeInTheDocument()
  })

  it('provides a searchable rights-managed image bank', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Image bank'}))
    expect(screen.getByRole('heading',{name:'Image bank'})).toBeInTheDocument()
    expect(screen.getByText('Valechester riverside hero')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search images'),{target:{value:'castle'}})
    expect(screen.getByText('Valechester Castle')).toBeInTheDocument()
    expect(screen.queryByText('Independent dining')).not.toBeInTheDocument()
  })

  it('starts a draft website experiment', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'A/B testing'}))
    expect(screen.getByRole('heading',{name:'A/B testing'})).toBeInTheDocument()
    expect(screen.getByText('Homepage hero message')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Start'}))
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'Pause'})).toBeInTheDocument()
  })

  it('filters organisations by location, health and type while keeping every match scrollable', () => {
    const {container}=renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Organisations'}))
    const scrollRegion=screen.getByLabelText('Organisation results. Scroll to view all matching organisations.')
    expect(scrollRegion).toHaveClass('organisation-table-scroll')
    expect(scrollRegion.querySelectorAll('tbody tr')).toHaveLength(initialData.organisations.length)
    fireEvent.change(screen.getByLabelText('Filter by location'),{target:{value:'Castle Quarter'}})
    fireEvent.change(screen.getByLabelText('Filter by organisation type'),{target:{value:'Attraction'}})
    const expected=initialData.organisations.filter((organisation)=>organisation.town==='Castle Quarter'&&organisation.type==='Attraction')
    expect(container.querySelectorAll('.organisations-table tbody tr')).toHaveLength(expected.length)
    expect(screen.getByLabelText('Filter by health')).toBeInTheDocument()
    expect(screen.getByText(`Showing all ${expected.length} matching organisations from ${initialData.organisations.length} records`)).toBeInTheDocument()
  })

  it('hides and restores organisation filters without clearing active filters', () => {
    const {container}=renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Organisations'}))
    fireEvent.change(screen.getByLabelText('Filter by location'),{target:{value:'Castle Quarter'}})
    const expected=initialData.organisations.filter((organisation)=>organisation.town==='Castle Quarter')
    expect(container.querySelectorAll('.organisations-table tbody tr')).toHaveLength(expected.length)
    fireEvent.click(screen.getByRole('button',{name:/Hide filters/}))
    expect(screen.queryByLabelText('Filter by location')).not.toBeInTheDocument()
    expect(screen.getByRole('button',{name:'Show filters, 1 active'})).toHaveAttribute('aria-expanded','false')
    expect(container.querySelectorAll('.organisations-table tbody tr')).toHaveLength(expected.length)
    expect(localStorage.getItem('visit-valechester-organisation-filters-visible')).toBe('false')
    fireEvent.click(screen.getByRole('button',{name:/Show filters/}))
    expect(screen.getByLabelText('Filter by location')).toHaveValue('Castle Quarter')
  })

  it('opens and completes a task', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: /Tasks/ }))
    const task = screen.getByText('Call The Lantern House Hotel about renewal')
    expect(task).toBeInTheDocument()
    const row = task.closest('.task-row')
    const completeButton = row?.querySelector('.task-check') as HTMLButtonElement
    fireEvent.click(completeButton)
    expect(screen.queryByText('Call The Lantern House Hotel about renewal')).not.toBeInTheDocument()
  })

  it('renders the public website from published CRM listings', () => {
    window.history.pushState({}, '', '/')
    renderApp()
    expect(screen.getByRole('heading', { name: /A town with stories/i })).toBeInTheDocument()
    expect(screen.getAllByText('Valechester Castle').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('.site-card')).toHaveLength(12)
  })

  it('lets visitors search and filter the interactive map', () => {
    window.history.pushState({}, '', '/map')
    renderApp()
    expect(screen.getByRole('heading', { name: 'Explore Valechester your way.' })).toBeInTheDocument()
    expect(screen.getByText(/mapped locations/)).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search the map' }), { target: { value: 'Valechester Castle' } })
    expect(screen.getByRole('button', { name: /Valechester Castle.*Castle Quarter/ })).toBeInTheDocument()
    expect(screen.getByText('1 mapped location')).toBeInTheDocument()
  })

  it('manages map visibility and featured pins in the CRM', () => {
    const app=renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Interactive map' }))
    expect(screen.getByRole('heading', { name: 'Interactive map' })).toBeInTheDocument()
    const featureButton = screen.getByRole('button', { name: 'Feature Valechester Castle' })
    fireEvent.click(featureButton)
    expect(screen.getByRole('button', { name: 'Unfeature Valechester Castle' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab',{name:'Map preview'}))
    expect(document.querySelectorAll('.map-location-marker.featured')).toHaveLength(1)
    expect(screen.getByText('Featured')).toBeInTheDocument()
    app.unmount()
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Interactive map' }))
    expect(screen.getByRole('button', { name: 'Unfeature Valechester Castle' })).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Search map locations...'), { target: { value: 'Valechester Castle' } })
    expect(screen.getByText(/52\./)).toBeInTheDocument()
  })

  it('provides at least fifteen published businesses for every membership type', () => {
    const publishedOrganisations = new Set(initialData.listings.filter((listing) => listing.status === 'Published').map((listing) => listing.organisationId))
    for (const level of initialData.levels) {
      const count = initialData.organisations.filter((organisation) => organisation.tier === level.name && publishedOrganisations.has(organisation.id)).length
      expect(count, level.name).toBeGreaterThanOrEqual(15)
    }
  })

  it('provides one reviewable best-practice listing template for every membership type', () => {
    window.history.pushState({}, '', '/listing-templates')
    renderApp()
    expect(screen.getByRole('heading', { name: 'Member listing templates.' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^View / })).toHaveLength(6)
    fireEvent.click(screen.getByRole('button', { name: 'View Vale Executive Travel' }))
    expect(screen.getByRole('heading', { name: 'Services for your business' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Request a quote/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Visit website/ })).toBeInTheDocument()
  })

  it('gives the highest level listing the complete visitor planning template', () => {
    window.history.pushState({}, '', '/place/list-001')
    renderApp()
    for (const heading of ['Gallery', 'At a glance', 'What visitors say', 'Accessibility information', 'Facilities', 'Opening information', 'Location and contact', 'Awards and accreditations', 'Make it part of your trip']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(screen.queryByText(/Strategic partner/i)).not.toBeInTheDocument()
    expect(document.querySelector<HTMLElement>('.template-place-page')?.style.getPropertyValue('--template-accent')).toBe('#a86b78')
  })

  it('shows the complete core listing visitor and search taxonomy without naming the level', () => {
    window.history.pushState({}, '', '/place/list-009')
    renderApp()
    expect(screen.getByRole('heading', { name: 'Visitor information' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Visitor interests' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Search filters' })).toBeInTheDocument()
    expect(screen.getByText('Independent shopping')).toBeInTheDocument()
    expect(screen.getByText('Wet-weather planners')).toBeInTheDocument()
    expect(screen.queryByText(/Tier 4/i)).not.toBeInTheDocument()
  })

  it('lets CRM users configure taxonomy allowances and review sites', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Memberships' }))
    expect(screen.getByText('Up to 12 searchable categories')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Listings' }))
    fireEvent.change(screen.getByPlaceholderText('Search listings...'), { target: { value: 'Wren & Quill Books' } })
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Review sites' }))
    expect(screen.getByRole('heading', { name: 'Review sites' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add review site' }))
    expect(screen.getByDisplayValue('Google Business Profile')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://')).toBeInTheDocument()
  })

  it('lets CRM editors manage listing images and hosted videos', () => {
    const {container}=renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Listings'}))
    fireEvent.change(screen.getByPlaceholderText('Search listings...'),{target:{value:'Valechester Castle'}})
    fireEvent.click(screen.getAllByRole('button',{name:'Edit'})[0])
    fireEvent.click(screen.getByRole('tab',{name:'Media'}))
    expect(screen.getByText('1/10 images · 0/2 videos')).toBeInTheDocument()
    const upload=container.querySelector<HTMLInputElement>('input[type="file"][multiple]')
    expect(upload).toHaveAttribute('accept','image/jpeg,image/png,image/webp')
    fireEvent.click(screen.getByRole('button',{name:'Add video'}))
    fireEvent.change(screen.getByLabelText('Video title'),{target:{value:'Castle highlights'}})
    fireEvent.change(screen.getByLabelText('Video URL'),{target:{value:'https://vimeo.com/123456'}})
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}))
    fireEvent.click(screen.getByRole('button',{name:'Close'}))
    fireEvent.click(screen.getAllByRole('button',{name:'Edit'})[0])
    fireEvent.click(screen.getByRole('tab',{name:'Media'}))
    expect(screen.getByDisplayValue('Castle highlights')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://vimeo.com/123456')).toBeInTheDocument()
  })

  it('creates a new listing draft and opens its editor', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Listings'}))
    fireEvent.click(screen.getByRole('button',{name:'Add listing'}))
    fireEvent.change(screen.getByLabelText('Listing name'),{target:{value:'New visitor experience'}})
    fireEvent.click(screen.getByRole('button',{name:'Create draft'}))
    expect(screen.getByRole('heading',{name:'Edit website listing'})).toBeInTheDocument()
    expect(screen.getByDisplayValue('New visitor experience')).toBeInTheDocument()
  })

  it('creates a membership pipeline opportunity', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Sales pipeline'}))
    fireEvent.click(screen.getAllByRole('button',{name:'Add opportunity'})[0])
    fireEvent.change(screen.getByLabelText('Organisation'),{target:{value:'Valechester Bakery'}})
    fireEvent.change(screen.getByLabelText('Contact'),{target:{value:'Jamie Stone'}})
    const addButtons=screen.getAllByRole('button',{name:'Add opportunity'})
    fireEvent.click(addButtons[addButtons.length-1])
    expect(screen.getByRole('heading',{name:'Valechester Bakery'})).toBeInTheDocument()
  })

  it('persists configurable workspace details', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Settings'}))
    fireEvent.change(screen.getByLabelText('Destination name'),{target:{value:'Visit New Vale'}})
    fireEvent.click(screen.getByRole('button',{name:'Save changes'}))
    const stored=JSON.parse(localStorage.getItem('visit-valechester-crm-v4')??'{}')
    expect(stored.workspace.destinationName).toBe('Visit New Vale')
  })

  it('uses configurable level names and keeps a Free Listing basic and unlinked', () => {
    window.history.pushState({}, '', '/listing-templates')
    const { unmount } = renderApp()
    for (const packageName of ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Supplier', 'Free Listing']) {
      expect(screen.getByText(packageName)).toBeInTheDocument()
    }
    unmount()
    window.history.pushState({}, '', '/place/list-011')
    const { container } = renderApp()
    expect(container.querySelector('.free-listing-brand-image .vale-logo')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Riverside Gardens', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Business information' })).toBeInTheDocument()
    expect(screen.getByText('Elegant public gardens following the curve of the River Vale.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /website|book/i })).not.toBeInTheDocument()
  })

  it('lets a visitor combine human questions when refining search results', () => {
    window.history.pushState({}, '', '/')
    renderApp()
    expect(screen.getByText('What would you like to do?')).toBeInTheDocument()
    expect(screen.getByText('Who are you visiting with?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('History & heritage'))
    fireEvent.click(screen.getByRole('checkbox', { name: /Families/ }))
    expect(screen.getByText(/places? match your choices/)).toBeInTheDocument()
    expect(screen.getByLabelText('Selected filters')).toBeInTheDocument()
  })

  it('turns a natural language search into visible filters with matching sample businesses', () => {
    window.history.pushState({}, '', '/')
    renderApp()
    const search=screen.getByLabelText('Search Valechester')
    fireEvent.change(search,{target:{value:'rainy day with my partner'}})
    fireEvent.submit(search.closest('form')!)
    expect(screen.getByRole('checkbox',{name:/A rainy day/})).toBeChecked()
    expect(screen.getByRole('checkbox',{name:/Couples & romantic visits/})).toBeChecked()
    expect(screen.queryByRole('heading',{name:'No exact matches yet'})).not.toBeInTheDocument()
    expect(screen.getByText(/places? match your choices/)).toBeInTheDocument()
  })

  it('orders public search results by membership level with free listings last', () => {
    window.history.pushState({}, '', '/')
    const {container}=renderApp()
    const loadMore=screen.getByRole('button',{name:/Show more places/})
    while(document.body.contains(loadMore)) fireEvent.click(loadMore)
    const cards=Array.from(container.querySelectorAll('.site-card'))
    const ranks=cards.map((card)=>{
      const name=card.querySelector('h3')?.textContent
      const listing=initialData.listings.find((item)=>item.name===name)
      const tier=initialData.organisations.find((organisation)=>organisation.id===listing?.organisationId)?.tier
      const level=initialData.levels.find((item)=>item.name===tier)
      return !level||level.price===0?Number.MAX_SAFE_INTEGER:initialData.levels.findIndex((item)=>item.id===level.id)
    })
    expect(ranks).toEqual([...ranks].sort((a,b)=>a-b))
    expect(ranks.at(-1)).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('gives every generated member business useful sample search taxonomy', () => {
    const generated=initialData.listings.filter((listing)=>/^list-1\d\d$/.test(listing.id))
    expect(generated.length).toBeGreaterThan(70)
    for(const listing of generated) expect(listing.searchTags.length,listing.name).toBeGreaterThanOrEqual(6)
    expect(generated.filter((listing)=>listing.searchTags.includes('Rainy-day activity')&&listing.searchTags.includes('Romantic')).length).toBeGreaterThanOrEqual(10)
  })

  it('lets a CRM user rename a membership level', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Memberships' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit level' })[0])
    fireEvent.change(screen.getByLabelText('Level name'), { target: { value: 'Premier Partner' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save level' }))
    expect(screen.getByRole('heading', { name: 'Premier Partner' })).toBeInTheDocument()
  })

  it('applies the approved tier template to every published member listing', async () => {
    window.history.pushState({}, '', '/place/list-002')
    renderApp()
    expect(screen.getByRole('heading', { name: 'The Keep Lodges', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Gallery' })).toBeInTheDocument()
    window.history.pushState({}, '', '/place/list-001')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(await screen.findByRole('heading', { name: 'Valechester Castle', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Half a day or more')).toBeInTheDocument()
  })

  it('shows fifty editable events in the CMS', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Events' }))
    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument()
    expect(screen.getByText('Showing 50 of 50 events')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Valechester After Dark' })).toBeInTheDocument()
  })

  it('opens the website inbox and content publishing workspace', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Website inbox'}))
    expect(screen.getByRole('heading',{name:'Inbox'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Guides, itineraries & trails'}))
    expect(screen.getByRole('heading',{name:'Guides, itineraries and trails'})).toBeInTheDocument()
    expect(screen.getByText('A rainy day in Valechester')).toBeInTheDocument()
  })

  it('publishes CMS inspiration through visitor routes', () => {
    window.history.pushState({},'', '/guides/rainy-day-valechester')
    renderApp()
    expect(screen.getByRole('heading',{name:'A rainy day in Valechester'})).toBeInTheDocument()
    expect(screen.getByText(/Start with the Museum of Motion/)).toBeInTheDocument()
  })

  it('opens an actionable workspace notification centre', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Notifications'}))
    expect(screen.getByText(/requiring attention/)).toBeInTheDocument()
    expect(screen.getAllByText(/awaiting review|overdue|due today|waiting for signature/i).length).toBeGreaterThan(0)
  })

  it('saves a place and opens the saved places page', () => {
    window.history.pushState({}, '', '/')
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Save Valechester Castle' }))
    expect(screen.getByText('Valechester Castle saved for your trip')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Saved places (1)' }))
    expect(screen.getByRole('heading', { name: 'Saved places' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Valechester Castle' })).toBeInTheDocument()
  })

  it('opens the events calendar from the homepage', () => {
    window.history.pushState({}, '', '/')
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: /View full calendar/ }))
    expect(screen.getByRole('heading', { name: 'Make a date of Valechester.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Harvest & Makers Market' })).toBeInTheDocument()
  })

  it('uses homepage visitor cards without replacing the existing search experience', () => {
    window.history.pushState({}, '', '/')
    renderApp()
    expect(screen.getByRole('heading', { name: 'Who’s visiting?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Events worth planning for.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Find your corner of the Vale.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Explore Eastgate' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Families/ }))
    expect(screen.getByRole('heading', { name: 'Results for “family”' })).toBeInTheDocument()
    expect(screen.getByLabelText('Search Valechester')).toHaveValue('family')
  })

  it('filters public events by search, date, location, event type and format', () => {
    window.history.pushState({}, '', '/events')
    renderApp()
    fireEvent.click(screen.getByRole('checkbox', { name: /Food & Drink/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Willowmere/ }))
    fireEvent.change(screen.getByLabelText('Events from date'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Events to date'), { target: { value: '2026-10-31' } })
    expect(screen.getByRole('heading', { name: 'Willowmere Apple Day' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Harvest & Makers Market' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search events' }), { target: { value: 'pumpkin' } })
    expect(screen.getByRole('heading', { name: 'No matching events' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear all filters' })[0])
    expect(screen.getByText('Showing 50 events')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Online events/ }))
    expect(screen.getByRole('heading', { name: 'Valechester Poetry Weekend' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Harvest & Makers Market' })).not.toBeInTheDocument()
  })

  it('builds a personalised itinerary', () => {
    window.history.pushState({}, '', '/plan')
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: /Build my trip/ }))
    expect(screen.getByRole('heading', { name: 'Your Valechester itinerary' })).toBeInTheDocument()
    expect(screen.getByText('Day 1')).toBeInTheDocument()
  })

  it('confirms the newsletter signup', () => {
    window.history.pushState({}, '', '/')
    renderApp()
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), { target: { value: 'visitor@example.com' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I agree to receive destination emails/ }))
    fireEvent.click(screen.getByRole('button', { name: /Count me in/ }))
    expect(screen.getByRole('heading', { name: 'You’re on the list.' })).toBeInTheDocument()
  })

  it('manages every website route through a draft and publish workflow', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Pages' }))
    expect(screen.getByRole('heading', { name: 'Pages' })).toBeInTheDocument()
    expect(screen.getAllByText('14').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Homepage' }))
    fireEvent.change(screen.getByLabelText('Page title'), { target: { value: 'A new story in every direction.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(screen.getByText('Draft changes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    expect(screen.getByText('Live v2')).toBeInTheDocument()
  })

  it('creates structured landing pages for prompted website changes', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Pages' }))
    fireEvent.click(screen.getByRole('button', { name: 'New landing page' }))
    fireEvent.change(screen.getByLabelText('Internal page name'), { target: { value: 'Autumn campaign' } })
    fireEvent.change(screen.getByLabelText('Website route'), { target: { value: '/autumn' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }))
    expect(screen.getByRole('heading', { name: 'Edit Autumn campaign' })).toBeInTheDocument()
    expect(screen.getByText('/autumn · Changes stay private until published.')).toBeInTheDocument()
  })

  it('creates campaigns from the CRM-wide Add new menu', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Add new'}))
    fireEvent.click(within(screen.getByRole('region',{name:'Quick create'})).getByRole('button',{name:/^Campaign/}))
    fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Spring by the river'}})
    fireEvent.change(screen.getByLabelText('Objective'),{target:{value:'Increase spring member referrals'}})
    fireEvent.change(screen.getByLabelText('Start / activity date'),{target:{value:'2027-03-01'}})
    fireEvent.change(screen.getByLabelText('End / closing date'),{target:{value:'2027-04-30'}})
    fireEvent.click(screen.getByRole('button',{name:'Create campaign'}))
    expect(screen.getByRole('heading',{name:'Campaigns'})).toBeInTheDocument()
    expect(screen.getByText('Spring by the river')).toBeInTheDocument()
  })

  it('creates a campaign plan and connects a partner, KPI and CRM task', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Campaigns'}))
    fireEvent.click(screen.getByRole('button',{name:'New campaign'}))
    fireEvent.change(screen.getByLabelText('Campaign name'),{target:{value:'River summer campaign'}})
    fireEvent.change(screen.getByLabelText('Objectives'),{target:{value:'Increase summer visits'}})
    fireEvent.change(screen.getByLabelText('Overall budget (£)'),{target:{value:'5000'}})
    fireEvent.click(screen.getByRole('button',{name:'Save campaign'}))
    expect(screen.getByRole('heading',{name:'River summer campaign'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab',{name:'Partners'}))
    fireEvent.change(screen.getByLabelText('Add organisation'),{target:{value:'org-001'}})
    fireEvent.click(screen.getByRole('button',{name:'Add partner'}))
    expect(screen.getByText('Valechester Castle')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab',{name:'Results'}))
    fireEvent.change(screen.getByLabelText('Target'),{target:{value:'1000'}})
    fireEvent.click(screen.getByRole('button',{name:'Add KPI'}))
    expect(screen.getAllByText('Website visits').length).toBeGreaterThan(1)
    fireEvent.click(screen.getByRole('tab',{name:'Tasks'}))
    fireEvent.change(screen.getByLabelText('Task'),{target:{value:'Prepare campaign creative'}})
    fireEvent.click(screen.getByRole('button',{name:'Add task'}))
    expect(screen.getByText('Prepare campaign creative')).toBeInTheDocument()
    const savedCampaigns=JSON.parse(localStorage.getItem(`visitmade-platform-v2-${tenant.id}`)??'{}').campaigns as Array<{name:string;partners:Array<{organisationId:string}>;kpis:Array<{metric:string}>}>
    expect(savedCampaigns.find((item)=>item.name==='River summer campaign')).toMatchObject({partners:[{organisationId:'org-001'}],kpis:[{metric:'website_visits'}]})
    const savedTasks=JSON.parse(localStorage.getItem('visit-valechester-crm-v4')??'{}').tasks as Array<{title:string;campaignId?:string}>
    expect(savedTasks.some((item)=>item.title==='Prepare campaign creative'&&Boolean(item.campaignId))).toBe(true)
  })

  it('creates an opportunity and persists an organisation invitation', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Opportunities'}))
    fireEvent.click(screen.getByRole('button',{name:'New opportunity'}))
    fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Autumn member showcase'}})
    fireEvent.change(screen.getByLabelText('Description'),{target:{value:'A featured place in the destination campaign.'}})
    fireEvent.click(screen.getByRole('button',{name:'Save opportunity'}))
    expect(screen.getByRole('heading',{name:'Autumn member showcase'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab',{name:'Applicants'}))
    fireEvent.change(screen.getByLabelText('Invite organisation'),{target:{value:'org-001'}})
    fireEvent.click(screen.getByRole('button',{name:'Invite'}))
    expect(screen.getByText('Valechester Castle')).toBeInTheDocument()
    const saved=JSON.parse(localStorage.getItem(`visitmade-platform-v2-${tenant.id}`)??'{}').memberOpportunities as Array<{title:string;invitedOrganisationIds:string[]}>
    expect(saved.find((item)=>item.title==='Autumn member showcase')?.invitedOrganisationIds).toContain('org-001')
  })

  it('records opportunity participation once in member value', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Opportunities'}))
    const card=screen.getByText('Christmas campaign partner feature').closest('article')!
    fireEvent.click(within(card).getByRole('button',{name:'Open opportunity'}))
    fireEvent.click(screen.getByRole('tab',{name:'Applicants'}))
    fireEvent.click(screen.getByRole('button',{name:'Approve'}))
    fireEvent.click(screen.getByRole('button',{name:'Confirm'}))
    fireEvent.click(screen.getByRole('button',{name:'Record participation'}))
    const saved=JSON.parse(localStorage.getItem(`visitmade-platform-v2-${tenant.id}`)??'{}') as typeof initialPlatformData
    expect(saved.memberOpportunities[0].applications[0].participated).toBe(true)
    expect(saved.memberValue.filter((entry)=>entry.opportunityId==='member-opp-001'&&entry.organisationId==='org-003')).toHaveLength(1)
    expect(screen.queryByRole('button',{name:'Record participation'})).not.toBeInTheDocument()
  })

  it('creates and edits a FAM trip with linked buyers and organisations', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Buyers, leads & FAMs'}))
    fireEvent.click(screen.getByRole('tab',{name:'FAM Trips'}))
    fireEvent.click(screen.getByRole('button',{name:'New FAM trip'}))
    fireEvent.change(screen.getByLabelText('Trip title'),{target:{value:'Autumn gardens FAM'}})
    fireEvent.change(screen.getByLabelText('Start date'),{target:{value:'2027-10-12'}})
    fireEvent.change(screen.getByLabelText('End date'),{target:{value:'2027-10-14'}})
    fireEvent.change(screen.getByLabelText('Target market'),{target:{value:'Germany'}})
    fireEvent.change(screen.getByLabelText('Add buyers'),{target:{value:'buyer-001'}})
    fireEvent.change(screen.getByLabelText('Add participating members'),{target:{value:'org-001'}})
    fireEvent.change(screen.getByLabelText('Itinerary'),{target:{value:'Day 1: gardens and welcome dinner.'}})
    fireEvent.click(screen.getByRole('button',{name:'Create FAM trip'}))
    expect(screen.getByRole('heading',{name:'Autumn gardens FAM'})).toBeInTheDocument()
    expect(screen.getByText('Valechester Castle')).toBeInTheDocument()
    expect(screen.getByText(/1 buyers · 0 places/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button',{name:'Edit FAM trip'}).at(-1)!)
    fireEvent.change(screen.getByLabelText('Itinerary'),{target:{value:'Day 1: gardens. Day 2: castle and dinner.'}})
    fireEvent.click(screen.getByRole('button',{name:'Save FAM trip'}))
    expect(screen.getByText('castle and dinner.')).toBeInTheDocument()
  })

  it('creates a trade profile using shared organisation and contact records', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Buyers, leads & FAMs'}))
    fireEvent.click(screen.getByRole('button',{name:'New trade profile'}))
    fireEvent.change(screen.getByLabelText('Trade organisation name'),{target:{value:'North Coast Tours'}})
    fireEvent.change(screen.getByLabelText('Primary contact'),{target:{value:'Jordan Reed'}})
    fireEvent.change(screen.getByLabelText('Primary contact email'),{target:{value:'jordan@example.com'}})
    fireEvent.change(screen.getByLabelText(/Markets \/ countries/),{target:{value:'Germany, Netherlands'}})
    fireEvent.click(screen.getByRole('button',{name:'Save trade profile'}))
    expect(screen.getByRole('heading',{name:'North Coast Tours'})).toBeInTheDocument()
    const crm=JSON.parse(localStorage.getItem('visit-valechester-crm-v4')??'{}') as typeof initialData
    const platform=JSON.parse(localStorage.getItem(`visitmade-platform-v2-${tenant.id}`)??'{}') as typeof initialPlatformData
    const org=crm.organisations.find((item)=>item.name==='North Coast Tours')!
    expect(org.tags).toContain('Travel Trade')
    expect(crm.contacts.find((item)=>item.organisationId===org.id)?.tags).toContain('Travel Trade')
    expect(platform.travelBuyers.find((item)=>item.company==='North Coast Tours')).toMatchObject({organisationId:org.id,sourceMarkets:['Germany','Netherlands']})
  })

  it('requires an evidenced outcome before counting a trade lead conversion', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Buyers, leads & FAMs'}))
    fireEvent.click(screen.getByRole('tab',{name:'Leads'}))
    fireEvent.click(screen.getByRole('button',{name:'Edit / distribute'}))
    fireEvent.change(screen.getByLabelText('Stage'),{target:{value:'Converted'}})
    fireEvent.click(screen.getByRole('button',{name:'Save trade lead'}))
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Record an outcome and conversion date')
    fireEvent.change(screen.getAllByLabelText('Shared date')[0],{target:{value:'2026-09-20'}})
    fireEvent.change(screen.getAllByLabelText('Response')[0],{target:{value:'Converted'}})
    fireEvent.change(screen.getByLabelText('Outcome'),{target:{value:'Confirmed group booking'}})
    fireEvent.change(screen.getByLabelText('Conversion date'),{target:{value:'2026-09-21'}})
    fireEvent.click(screen.getByRole('button',{name:'Save trade lead'}))
    const platform=JSON.parse(localStorage.getItem(`visitmade-platform-v2-${tenant.id}`)??'{}') as typeof initialPlatformData
    expect(platform.tradeLeads[0]).toMatchObject({stage:'Converted',convertedAt:'2026-09-21',outcome:'Confirmed group booking'})
    expect(screen.getAllByText('Recorded conversions').length).toBeGreaterThan(0)
  })

  it('creates a business events enquiry linked to the shared organisation and contact', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Enquiries & venues'}))
    fireEvent.click(screen.getByRole('button',{name:'New enquiry'}))
    fireEvent.change(screen.getByLabelText('Enquiry name'),{target:{value:'Spring association congress'}})
    fireEvent.change(screen.getByLabelText('Buyer organisation'),{target:{value:'org-001'}})
    fireEvent.change(screen.getByLabelText('Buyer contact'),{target:{value:'con-001'}})
    fireEvent.change(screen.getByLabelText('Event type'),{target:{value:'Congress'}})
    fireEvent.change(screen.getByLabelText('Lead source'),{target:{value:'Website enquiry'}})
    fireEvent.click(screen.getByRole('button',{name:'Save enquiry'}))
    const platform=JSON.parse(localStorage.getItem(`visitmade-platform-v2-${tenant.id}`)??'{}') as typeof initialPlatformData
    expect(platform.businessEnquiries.find((item)=>item.name==='Spring association congress')).toMatchObject({organisationId:'org-001',contactId:'con-001',stage:'New'})
    expect(screen.getByText('Spring association congress')).toBeInTheDocument()
  })

  it('classifies a shared organisation as a business events buyer', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Enquiries & venues'}))
    fireEvent.click(screen.getByRole('tab',{name:'Buyers'}))
    fireEvent.click(screen.getByRole('button',{name:'New buyer'}))
    fireEvent.change(screen.getByLabelText('CRM organisation'),{target:{value:'org-003'}})
    fireEvent.change(screen.getByLabelText(/Markets/),{target:{value:'UK, Ireland'}})
    fireEvent.click(screen.getByRole('button',{name:'Save buyer'}))
    const crm=JSON.parse(localStorage.getItem('visit-valechester-crm-v4')??'{}') as typeof initialData
    const platform=JSON.parse(localStorage.getItem(`visitmade-platform-v2-${tenant.id}`)??'{}') as typeof initialPlatformData
    expect(crm.organisations.find((item)=>item.id==='org-003')?.tags).toContain('Business Events')
    expect(platform.businessBuyers.find((item)=>item.organisationId==='org-003')).toMatchObject({markets:['UK','Ireland'],type:'Corporate'})
  })

  it('records transparent estimated member value', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Member Value'}))
    fireEvent.click(screen.getByRole('button',{name:'Record value'}))
    fireEvent.change(screen.getByLabelText('Description'),{target:{value:'Photography support'}})
    fireEvent.change(screen.getByRole('spinbutton',{name:/Estimated value/}),{target:{value:'175'}})
    fireEvent.change(screen.getByLabelText('Evidence'),{target:{value:'Winter image shoot'}})
    fireEvent.click(screen.getByRole('button',{name:'Save record'}))
    expect(screen.getByText('Photography support')).toBeInTheDocument()
    expect(screen.getByText('£175 estimated')).toBeInTheDocument()
  })

  it('does not expose CRM seed data or demo sign-in through the secure portal', async () => {
    window.history.pushState({},'', '/portal')
    render(<SecurePortalApp />)
    expect(await screen.findByText(/Demo access is disabled/)).toBeInTheDocument()
    expect(screen.queryByText('Valechester Castle')).not.toBeInTheDocument()
  })

  it('accepts a public survey response', () => {
    window.history.pushState({},'', '/survey/member-satisfaction-2026')
    renderApp()
    fireEvent.click(screen.getByRole('radio',{name:'9'}))
    fireEvent.change(screen.getByLabelText('What should we improve?'),{target:{value:'More trade opportunities'}})
    fireEvent.click(screen.getByRole('button',{name:'Submit response'}))
    expect(screen.getByRole('heading',{name:'Response received'})).toBeInTheDocument()
  })

  it('queries live workspace records through Ask VisitMade', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button',{name:'Ask VisitMade'}))
    fireEvent.change(screen.getByLabelText('Ask about this workspace'),{target:{value:'Which invoices are overdue?'}})
    fireEvent.click(screen.getByRole('button',{name:'Ask'}))
    expect(screen.getByText(/results from overdue invoices/)).toBeInTheDocument()
    expect(screen.getByText(/VV-2026-1018/)).toBeInTheDocument()
  })

  it('requires an account before opening the CRM', () => {
    localStorage.removeItem('visit-valechester-auth-v2')
    renderApp()
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByText('Workspace access')).toBeInTheDocument()
  })
})
