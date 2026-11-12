import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from '../src/shared/ui/EmptyState'
import { ErrorState } from '../src/shared/ui/ErrorState'
import { SuccessState } from '../src/shared/ui/SuccessState'

describe('empty, error, and success state primitives (US5)', () => {
  it('renders an empty state with optional action', () => {
    render(
      <EmptyState
        heading="No tasks"
        description="Create your first task"
        action={<button type="button">Create</button>}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'No tasks' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Create your first task')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('renders an error state as an alert with retry action', () => {
    render(
      <ErrorState
        heading="Could not load"
        description="Try again"
        action={<button type="button">Retry</button>}
      />,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Could not load')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('announces success feedback through a polite live region', () => {
    render(
      <SuccessState message="Saved" description="Your changes were stored." />,
    )
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('Saved')
  })
})
