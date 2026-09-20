import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { CRMProvider } from './store'
import { AuthProvider } from './auth'
import { FeatureProvider } from './features'

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
    expect(screen.getByText('Members by tier')).toBeInTheDocument()
    expect(screen.getByText('Visitor review trends')).toBeInTheDocument()
    expect(screen.getByText('5.8m')).toBeInTheDocument()
  })

  it('navigates to the organisations workspace', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Organisations' }))
    expect(screen.getByRole('heading', { name: 'Organisations' })).toBeInTheDocument()
    expect(screen.getByText('Valechester Castle')).toBeInTheDocument()
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
    expect(screen.queryByText('The Lantern House Hotel')).not.toBeInTheDocument()
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
