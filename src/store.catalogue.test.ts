import { describe, expect, it } from 'vitest'
import { initialData } from './data'
import { catalogueFromDatabase, readInitialData } from './store'

describe('database-backed catalogue initial state', () => {
  it('does not show bundled listings or events while database rows load', () => {
    const data = readInitialData(true)
    expect(data.listings).toEqual([])
    expect(data.events).toEqual([])
    expect(data.organisations.length).toBeGreaterThan(0)
  })

  it('keeps bundled catalogue records in explicit local demo mode', () => {
    const data = readInitialData(false)
    expect(data.listings.length).toBe(initialData.listings.length)
    expect(data.events.length).toBe(initialData.events.length)
  })

  it('does not resurrect cached catalogue records in database mode', () => {
    localStorage.setItem('visit-valechester-crm-v4', JSON.stringify(initialData))
    const data = readInitialData(true)
    expect(data.listings).toEqual([])
    expect(data.events).toEqual([])
  })

  it('treats an empty database catalogue as empty even when the workspace snapshot has samples', () => {
    const data = catalogueFromDatabase(initialData, [], [])
    expect(data.listings).toEqual([])
    expect(data.events).toEqual([])
  })

  it('shows private draft edits to staff without changing the published row or sample counters', () => {
    const published={id:'list-001',organisation_id:'org-001',name:'Published name',category:'Attractions',town:'Valechester',status:'Published',completeness:90,views:18420,enquiries:814,short_description:'Published summary',description:'Published description',website:'',booking_url:'',phone:'',email:'',opening_hours:'Daily',facilities:[],image:'castle',media:[],updated_at:'2026-09-25T12:00:00Z'} as Parameters<typeof catalogueFromDatabase>[1][number]
    const draft={...published,name:'Private draft name',status:'In review'} as typeof published
    const data=catalogueFromDatabase(initialData,[published],[],[{id:published.id,data:draft}],[{listing_id:published.id,views:3,views_this_month:2,enquiries:1}])
    expect(data.listings[0]).toMatchObject({name:'Private draft name',status:'In review',isPublic:true,hasUnpublishedChanges:true,views:3,viewsThisMonth:2,enquiries:1})
    expect(published.name).toBe('Published name')
  })
})
