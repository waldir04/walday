import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { TASKS_STORAGE_KEY } from '@/shared/config/tasks'
import { renderTasksPage } from './helpers/renderTasks'

function addTask(title: string) {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: title },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
}

function requestDelete(title: string) {
  const opener = screen.getByRole('button', { name: `Delete ${title}` })
  opener.focus()
  fireEvent.click(opener)
  return screen.getByRole('dialog', { name: 'Delete task' })
}

function readTasks(): Record<string, unknown>[] {
  const raw = localStorage.getItem(TASKS_STORAGE_KEY)
  if (raw === null) return []
  const parsed = JSON.parse(raw) as { tasks: Record<string, unknown>[] }
  return parsed.tasks
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('deleting tasks', () => {
  it('requires confirmation and identifies the task by title', async () => {
    renderTasksPage()
    addTask('Delete me')
    await screen.findByText('Delete me')

    const dialog = requestDelete('Delete me')
    expect(dialog).toHaveAccessibleDescription(/Delete “Delete me”\?/)
    expect(screen.getByText('Delete me')).toBeInTheDocument()
    expect(readTasks()).toHaveLength(1)
  })

  it('cancels deletion and restores focus to the invoking control', async () => {
    renderTasksPage()
    addTask('Cancel delete')
    await screen.findByText('Cancel delete')

    requestDelete('Cancel delete')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Cancel delete')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Delete Cancel delete' }),
    ).toHaveFocus()
    expect(readTasks()).toHaveLength(1)
  })

  it('cancels deletion on Escape', async () => {
    renderTasksPage()
    addTask('Escape delete')
    await screen.findByText('Escape delete')

    const dialog = requestDelete('Escape delete')
    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Escape delete')).toBeInTheDocument()
  })

  it('confirms deletion, announces it, persists it, and focuses the next task', async () => {
    renderTasksPage()
    addTask('Older task')
    await screen.findByText('Older task')
    addTask('Newer task')
    await screen.findByText('Newer task')

    requestDelete('Newer task')
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    await waitFor(() =>
      expect(screen.queryByText('Newer task')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Older task')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Task deleted.')
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Mark Older task complete' }),
      ).toHaveFocus(),
    )
    expect(readTasks().map((task) => task.title)).toEqual(['Older task'])
  })

  it('deletes the last task and focuses the empty-state action', async () => {
    renderTasksPage()
    addTask('Last task')
    await screen.findByText('Last task')

    requestDelete('Last task')
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    expect(
      await screen.findByRole('heading', { name: 'No tasks yet' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Create a task' }),
      ).toHaveFocus(),
    )
    expect(readTasks()).toHaveLength(0)
  })

  it('deletes a completed task with the same confirmation', async () => {
    renderTasksPage()
    addTask('Completed delete')
    await screen.findByText('Completed delete')
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Mark Completed delete complete' }),
    )
    await screen.findByRole('checkbox', {
      name: 'Mark Completed delete pending',
    })

    requestDelete('Completed delete')
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    await waitFor(() =>
      expect(screen.queryByText('Completed delete')).not.toBeInTheDocument(),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('never opens deletion or deletes when completing a task', async () => {
    renderTasksPage()
    addTask('Keep me')
    await screen.findByText('Keep me')

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Mark Keep me complete' }),
    )

    await screen.findByRole('checkbox', { name: 'Mark Keep me pending' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Keep me')).toBeInTheDocument()
    expect(readTasks()).toHaveLength(1)
  })

  it('reports session-only deletion when the write fails', async () => {
    renderTasksPage()
    addTask('Unsaved delete')
    await screen.findByText('Unsaved delete')

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    requestDelete('Unsaved delete')
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    await waitFor(() =>
      expect(screen.queryByText('Unsaved delete')).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Task deleted for this session only. The deletion was not saved.',
    )
    expect(
      screen.getByRole('heading', { name: 'Changes may not be saved' }),
    ).toBeInTheDocument()

    vi.restoreAllMocks()
    expect(readTasks()).toHaveLength(1)
  })
})
