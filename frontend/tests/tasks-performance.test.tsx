import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Task } from '@/entities/task'
import { TASKS_STORAGE_KEY } from '@/shared/config/tasks'
import { applyLanguage } from '@/shared/i18n'
import { makeEnvelope } from './helpers/taskFixtures'
import { renderTasksPage } from './helpers/renderTasks'

function makeManyTasks(count: number): Task[] {
  const base = Date.UTC(2026, 0, 1, 0, 0, 0)
  return Array.from({ length: count }, (_, index) => ({
    id: `task-${index + 1}`,
    title: `Task ${index + 1}`,
    status: 'pending' as const,
    priority: 'medium' as const,
    createdAt: new Date(base + (index + 1) * 1000).toISOString(),
  }))
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('large task lists', () => {
  it('renders, groups, and orders 500 tasks within a generous smoke budget', async () => {
    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify(makeEnvelope(makeManyTasks(500))),
    )

    const renderStart = performance.now()
    renderTasksPage()
    await screen.findByText('Task 500')
    const renderDuration = performance.now() - renderStart

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(500)
    expect(
      screen.getByRole('heading', { name: 'Pending tasks' }),
    ).toBeInTheDocument()

    const firstCheckbox = items[0]?.querySelector('input[type="checkbox"]')
    expect(firstCheckbox?.getAttribute('data-completion-for')).toBe('task-500')

    const actionStart = performance.now()
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Mark Task 500 complete' }),
    )
    await screen.findByRole('checkbox', {
      name: 'Mark Task 500 pending',
    })
    const actionDuration = performance.now() - actionStart

    expect(
      screen.getByRole('heading', { name: 'Completed tasks' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(500)

    expect(renderDuration).toBeLessThan(5000)
    expect(actionDuration).toBeLessThan(3000)

    await waitFor(() => expect(screen.getByText('Task 1')).toBeInTheDocument())
  }, 20000)
})
