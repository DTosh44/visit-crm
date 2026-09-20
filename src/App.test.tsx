import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { CRMProvider } from './store'

function renderApp() {
  return render(<CRMProvider><App /></CRMProvider>)
}

describe('Visit CRM', () => {
  it('renders the destination dashboard', () => {
    renderApp()
    expect(screen.getByText('Good morning, Darren')).toBeInTheDocument()
    expect(screen.getAllByText('Membership income')).toHaveLength(2)
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
  })

  it('navigates to the organisations workspace', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Organisations' }))
    expect(screen.getByRole('heading', { name: 'Organisations' })).toBeInTheDocument()
    expect(screen.getByText('Warwick Castle')).toBeInTheDocument()
  })

  it('opens and completes a task', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: /Tasks/ }))
    const task = screen.getByText('Call The Arden Hotel about renewal')
    expect(task).toBeInTheDocument()
    const row = task.closest('.task-row')
    const completeButton = row?.querySelector('.task-check') as HTMLButtonElement
    fireEvent.click(completeButton)
    expect(screen.queryByText('Call The Arden Hotel about renewal')).not.toBeInTheDocument()
  })
})
