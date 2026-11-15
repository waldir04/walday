import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { renderApp } from './helpers/renderApp'
import { TasksPageSkeleton } from '@/features/tasks'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('tasks route loading', () => {
  it('shows the layout-matching task skeleton while the lazy chunk loads', () => {
    const { container } = render(<TasksPageSkeleton />)

    const busy = container.querySelector('[aria-busy="true"]')
    expect(busy).not.toBeNull()
    expect(busy).toHaveTextContent('Loading tasks')
    const decorative = busy?.querySelectorAll('[aria-hidden="true"]')
    expect(decorative?.length ?? 0).toBeGreaterThan(0)
  })

  it('renders the task page through the lazy route with the app shell', async () => {
    renderApp(['/tasks'])

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tasks' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
  })
})
