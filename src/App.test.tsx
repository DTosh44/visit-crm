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
    localStorage.setItem('visit-valechester-auth-v1', 'usr-darren')
    window.history.pushState({}, '', '/crm')
    window.location.hash = ''
  })

  it('renders the destination dashboard', () => {
    renderApp()
    expect(screen.getByText('Good morning, Darren')).toBeInTheDocument()
    expect(screen.getAllByText('Membership income')).toHaveLength(2)
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
    expect(screen.getByText('Members by tier')).toBeInTheDocument()
    expect(screen.getByText('Social performance')).toBeInTheDocument()
    expect(screen.getByText('22.5m')).toBeInTheDocument()
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

  it('requires an account before opening the CRM', () => {
    localStorage.removeItem('visit-valechester-auth-v1')
    renderApp()
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByText('Demo access')).toBeInTheDocument()
  })
})
