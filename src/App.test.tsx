import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { CRMProvider } from './store'
import { AuthProvider } from './auth'
import { FeatureProvider } from './features'
import { initialData } from './data'

function renderApp() {
  return render(<AuthProvider><FeatureProvider><CRMProvider><App /></CRMProvider></FeatureProvider></AuthProvider>)
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
    expect(screen.getByText('Good morning, Alex')).toBeInTheDocument()
    expect(screen.getByText('Membership income')).toBeInTheDocument()
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
    expect(screen.getByText('Members by level')).toBeInTheDocument()
    expect(screen.getByText('Visitor review trends')).toBeInTheDocument()
    expect(screen.getByText('5.8m')).toBeInTheDocument()
  })

  it('navigates to the organisations workspace', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Organisations' }))
    expect(screen.getByRole('heading', { name: 'Organisations' })).toBeInTheDocument()
    expect(screen.getByText('Valechester Castle')).toBeInTheDocument()
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
    fireEvent.click(screen.getByText('Families'))
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
    fireEvent.click(screen.getByRole('button', { name: /Count me in/ }))
    expect(screen.getByRole('heading', { name: 'You’re on the list.' })).toBeInTheDocument()
  })

  it('requires an account before opening the CRM', () => {
    localStorage.removeItem('visit-valechester-auth-v2')
    renderApp()
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByText('Workspace access')).toBeInTheDocument()
  })
})
