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
})
