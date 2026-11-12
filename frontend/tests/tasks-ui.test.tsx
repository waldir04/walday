import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppProviders } from '../src/app/providers'
import { TasksPage } from '../src/pages/TasksPage'
import '../src/shared/i18n'

function renderTasks() {
  return render(
    <AppProviders>
      <TasksPage />
    </AppProviders>,
  )
}

function addTask(title: string) {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } })
  fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
}

describe('tasks feature behavior (preserved)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates a task with optional metadata and shows localized labels', async () => {
    renderTasks()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Write report' },
    })
    fireEvent.change(screen.getByLabelText('Priority'), {
      target: { value: 'high' },
    })
    fireEvent.change(screen.getByLabelText('Due date (optional)'), {
      target: { value: '2026-11-20' },
    })
    fireEvent.change(screen.getByLabelText('Duration (optional)'), {
      target: { value: '45 min' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByText('Write report')).toBeInTheDocument()
    expect(screen.getByText('Priority: High')).toBeInTheDocument()
    expect(screen.getByText('Due: 2026-11-20')).toBeInTheDocument()
    expect(screen.getByText('Duration: 45 min')).toBeInTheDocument()
    await waitFor(() =>
      expect(localStorage.getItem('walday:tasks')).toContain('Write report'),
    )
  })

  it('rejects a short title with an associated accessible error', () => {
    renderTasks()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'ab' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Title must be at least 3 characters')
    expect(screen.getByLabelText('Title')).toHaveAttribute(
      'aria-describedby',
      'task-title-error',
    )
    expect(screen.queryByText('ab')).not.toBeInTheDocument()
  })

  it('toggles completion and updates the accessible checkbox label', async () => {
    renderTasks()
    addTask('Toggle me')

    const checkbox = await screen.findByRole('checkbox', {
      name: 'Mark Toggle me complete',
    })
    fireEvent.click(checkbox)
    expect(
      await screen.findByRole('checkbox', { name: 'Mark Toggle me pending' }),
    ).toBeChecked()
  })

  it('edits a task title inline', async () => {
    renderTasks()
    addTask('Original title')
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))

    const input = screen.getByDisplayValue('Original title')
    fireEvent.change(input, { target: { value: 'Updated title' } })
    fireEvent.blur(input)

    expect(await screen.findByText('Updated title')).toBeInTheDocument()
    expect(screen.queryByText('Original title')).not.toBeInTheDocument()
  })

  it('confirms and cancels deletion', async () => {
    renderTasks()
    addTask('Delete me')

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Confirm delete?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Confirm delete?')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    await waitFor(() =>
      expect(screen.queryByText('Delete me')).not.toBeInTheDocument(),
    )
  })
})
