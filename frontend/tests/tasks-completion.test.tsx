import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TASKS_STORAGE_KEY } from '@/shared/config/tasks'
import { applyLanguage } from '@/shared/i18n'
import { renderTasksPage } from './helpers/renderTasks'

function addTask(title: string) {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: title },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
}

function readTasks(): Record<string, unknown>[] {
  const raw = localStorage.getItem(TASKS_STORAGE_KEY)
  if (raw === null) return []
  return (JSON.parse(raw) as { tasks: Record<string, unknown>[] }).tasks
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('task completion', () => {
  it('toggles a task to completed, preserves metadata, and announces it', async () => {
    renderTasksPage()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Complete me' },
    })
    fireEvent.change(screen.getByLabelText('Description (optional)'), {
      target: { value: 'Keep this description' },
    })
    fireEvent.change(screen.getByLabelText('Priority'), {
      target: { value: 'high' },
    })
    fireEvent.change(screen.getByLabelText('Duration (optional)'), {
      target: { value: '30 min' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    await screen.findByText('Complete me')

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Mark Complete me complete' }),
    )

    const completedCheckbox = await screen.findByRole('checkbox', {
      name: 'Mark Complete me pending',
    })
    expect(completedCheckbox).toBeChecked()
    expect(
      screen.getByRole('heading', { name: 'Completed tasks' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Keep this description')).toBeInTheDocument()
    expect(screen.getByText('Priority: High')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Task marked complete.',
    )
    expect(readTasks()[0]?.status).toBe('completed')
  })

  it('moves focus to the completion control after regrouping', async () => {
    renderTasksPage()
    addTask('Focus task')
    await screen.findByText('Focus task')

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Mark Focus task complete' }),
    )

    const checkbox = await screen.findByRole('checkbox', {
      name: 'Mark Focus task pending',
    })
    await waitFor(() => expect(checkbox).toHaveFocus())
    const completedGroup = screen
      .getByRole('heading', { name: 'Completed tasks' })
      .closest('section')
    expect(completedGroup).not.toBeNull()
    expect(
      within(completedGroup as HTMLElement).getByText('Focus task'),
    ).toBeInTheDocument()
  })

  it('toggles a completed task back to pending and restores focus', async () => {
    renderTasksPage()
    addTask('Toggle twice')
    await screen.findByText('Toggle twice')

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Mark Toggle twice complete' }),
    )
    await screen.findByRole('checkbox', { name: 'Mark Toggle twice pending' })

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Mark Toggle twice pending' }),
    )

    const checkbox = await screen.findByRole('checkbox', {
      name: 'Mark Toggle twice complete',
    })
    expect(checkbox).not.toBeChecked()
    expect(
      screen.getByRole('heading', { name: 'Pending tasks' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Task marked pending.')
    await waitFor(() => expect(checkbox).toHaveFocus())
    expect(readTasks()[0]?.status).toBe('pending')
  })

  it('keeps completion status after reload', async () => {
    renderTasksPage()
    addTask('Persist completion')
    await screen.findByText('Persist completion')
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Mark Persist completion complete',
      }),
    )
    await screen.findByRole('checkbox', {
      name: 'Mark Persist completion pending',
    })

    cleanup()
    renderTasksPage()

    expect(await screen.findByText('Persist completion')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Mark Persist completion pending' }),
    ).toBeChecked()
    expect(
      screen.getByRole('heading', { name: 'Completed tasks' }),
    ).toBeInTheDocument()
  })

  it('never deletes a task when completing it and exposes a 24px target', async () => {
    renderTasksPage()
    addTask('Never delete')
    await screen.findByText('Never delete')

    const checkbox = screen.getByRole('checkbox', {
      name: 'Mark Never delete complete',
    })
    expect(checkbox.className).toContain('h-6')
    expect(checkbox.className).toContain('w-6')
    expect(checkbox.className).toContain('min-h-6')
    expect(checkbox.className).toContain('min-w-6')

    fireEvent.click(checkbox)
    await screen.findByRole('checkbox', { name: 'Mark Never delete pending' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Never delete')).toBeInTheDocument()
    expect(readTasks()).toHaveLength(1)
  })

  it('does not submit a second toggle while the first is pending', async () => {
    renderTasksPage()
    addTask('Single toggle')
    await screen.findByText('Single toggle')

    const checkbox = screen.getByRole('checkbox', {
      name: 'Mark Single toggle complete',
    })
    fireEvent.click(checkbox)
    fireEvent.click(checkbox)

    await screen.findByRole('checkbox', { name: 'Mark Single toggle pending' })
    expect(readTasks()[0]?.status).toBe('completed')
  })
})
