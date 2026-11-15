import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TASKS_STORAGE_KEY } from '@/shared/config/tasks'
import { applyLanguage } from '@/shared/i18n'
import { makeEnvelope, makeStoredTask, makeTask } from './helpers/taskFixtures'
import { renderTasksPage } from './helpers/renderTasks'

function seed(value: unknown) {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(value))
}

function storedRaw(): string {
  return localStorage.getItem(TASKS_STORAGE_KEY) ?? ''
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('task page states', () => {
  it('restores stored tasks and announces restoration', async () => {
    seed(makeEnvelope([makeStoredTask({ title: 'Restored task' })]))
    renderTasksPage()

    expect(await screen.findByText('Restored task')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Tasks restored.')
  })

  it('shows a recovery state instead of the empty state for a corrupt payload', () => {
    localStorage.setItem(TASKS_STORAGE_KEY, '{corrupt')
    renderTasksPage()

    expect(
      screen.getByRole('heading', { name: 'Stored data needs attention' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Some stored tasks could not be restored',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'No tasks yet' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/Guest data is stored locally/i),
    ).toBeInTheDocument()
    expect(storedRaw()).toBe('{corrupt')
  })

  it('restores valid records and reports unreadable ones', async () => {
    seed(
      makeEnvelope([
        makeStoredTask({ id: 'valid', title: 'Valid restored task' }),
        makeStoredTask({ id: 'invalid', title: 'ab' }),
        makeStoredTask({ id: 'dupe' }),
        makeStoredTask({ id: 'dupe' }),
      ]),
    )
    renderTasksPage()

    expect(await screen.findByText('Valid restored task')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Some stored tasks could not be restored',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/3 stored records could not be restored/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'No tasks yet' }),
    ).not.toBeInTheDocument()
  })

  it('preserves an unsupported newer payload without offering discard', () => {
    const raw = JSON.stringify(makeEnvelope([], { version: 99 }))
    localStorage.setItem(TASKS_STORAGE_KEY, raw)
    renderTasksPage()

    expect(
      screen.getByRole('heading', {
        name: 'Stored data was written by a newer version',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Stored tasks were written by a newer version',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Discard unreadable data' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'No tasks yet' }),
    ).not.toBeInTheDocument()
    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBe(raw)
  })

  it('confirms and discards unreadable data after cancellation enters protected mode', async () => {
    localStorage.setItem(TASKS_STORAGE_KEY, '{corrupt')
    renderTasksPage()

    fireEvent.click(
      screen.getByRole('button', { name: 'Discard unreadable data' }),
    )
    let dialog = screen.getByRole('dialog', {
      name: 'Discard unreadable data?',
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(
      screen.getByRole('heading', { name: 'Stored data is protected' }),
    ).toBeInTheDocument()
    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBe('{corrupt')

    fireEvent.click(
      screen.getByRole('button', { name: 'Discard unreadable data' }),
    )
    dialog = screen.getByRole('dialog', {
      name: 'Discard unreadable data?',
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Discard' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Stored data is protected' }),
      ).not.toBeInTheDocument(),
    )
    const stored = JSON.parse(storedRaw()) as Record<string, unknown>
    expect(stored.version).toBe(2)
    expect(stored.revision).toEqual(expect.any(String))
  })

  it('keeps restored valid tasks when unreadable data is discarded', async () => {
    seed(
      makeEnvelope([
        makeStoredTask({ id: 'valid', title: 'Surviving task' }),
        makeStoredTask({ id: 'invalid', title: 'ab' }),
      ]),
    )
    renderTasksPage()
    await screen.findByText('Surviving task')

    fireEvent.click(
      screen.getByRole('button', { name: 'Discard unreadable data' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('heading', {
          name: 'Some stored tasks could not be restored',
        }),
      ).not.toBeInTheDocument(),
    )
    const stored = JSON.parse(storedRaw()) as {
      tasks: { id: string }[]
    }
    expect(stored.tasks.map((task) => task.id)).toEqual(['valid'])
  })

  it('keeps in-memory task operations available when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    renderTasksPage()

    expect(
      screen.getByRole('heading', { name: 'Changes may not be saved' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toContain(
      'only to this session',
    )

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Offline task' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByText('Offline task')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Task created for this session only. It was not saved.',
    )
  })

  it('retries persistence from memory-only mode and returns to normal', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    renderTasksPage()

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Retry task' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    await screen.findByText('Retry task')

    vi.restoreAllMocks()
    fireEvent.click(screen.getByRole('button', { name: 'Try saving again' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Changes may not be saved' }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('status')).toHaveTextContent('Changes saved.')
    const stored = JSON.parse(storedRaw()) as { tasks: unknown[] }
    expect(stored.tasks).toHaveLength(1)
  })

  it('shows the empty state in normal mode while keeping the guest notice visible', () => {
    renderTasksPage()
    expect(
      screen.getByRole('heading', { name: 'No tasks yet' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Guest data is stored locally/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Changes may not be saved' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the completed group visible when only completed tasks exist', async () => {
    seed(
      makeEnvelope([
        makeTask({
          id: 'done',
          title: 'Finished task',
          status: 'completed',
        }),
      ]),
    )
    renderTasksPage()

    expect(await screen.findByText('Finished task')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Completed tasks' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'No tasks yet' }),
    ).not.toBeInTheDocument()
  })
})

describe('grouped display and metadata', () => {
  it('renders pending tasks before completed tasks with newest first', async () => {
    seed(
      makeEnvelope([
        makeTask({
          id: 'pending-old',
          title: 'Pending older',
          createdAt: '2026-11-10T10:00:00.000Z',
        }),
        makeTask({
          id: 'pending-new',
          title: 'Pending newer',
          createdAt: '2026-11-12T10:00:00.000Z',
        }),
        makeTask({
          id: 'completed',
          title: 'Completed task',
          status: 'completed',
          createdAt: '2026-11-13T10:00:00.000Z',
        }),
      ]),
    )
    renderTasksPage()
    await screen.findByText('Pending newer')

    const items = screen.getAllByRole('listitem')
    expect(
      items.map((item) =>
        within(item)
          .getAllByRole('checkbox')
          .map((checkbox) => checkbox.getAttribute('data-completion-for')),
      ),
    ).toEqual([['pending-new'], ['pending-old'], ['completed']])
    expect(
      screen.getByRole('heading', { name: 'Pending tasks' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Completed tasks' }),
    ).toBeInTheDocument()
  })

  it('renders localized priority, due date, and duration metadata', async () => {
    seed(
      makeEnvelope([
        makeTask({
          id: 'metadata',
          title: 'Metadata task',
          priority: 'low',
          dueDate: '2026-12-20',
          estimatedMinutes: 120,
        }),
      ]),
    )
    renderTasksPage()

    expect(await screen.findByText('Metadata task')).toBeInTheDocument()
    expect(screen.getByText('Priority: Low')).toBeInTheDocument()
    expect(screen.getByText(/Due: Dec 20, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Duration: 2 hours/)).toBeInTheDocument()
  })

  it('marks only pending tasks with a past due date as past due', async () => {
    seed(
      makeEnvelope([
        makeTask({
          id: 'overdue',
          title: 'Overdue pending',
          dueDate: '2020-01-01',
        }),
        makeTask({
          id: 'completed-overdue',
          title: 'Overdue completed',
          status: 'completed',
          dueDate: '2020-01-01',
        }),
      ]),
    )
    renderTasksPage()
    await screen.findByText('Overdue pending')

    expect(screen.getAllByText('Past due')).toHaveLength(1)
    const items = screen.getAllByRole('listitem')
    expect(
      within(items[0] as HTMLElement).getByText('Past due'),
    ).toBeInTheDocument()
  })

  it('wraps long titles and descriptions without dropping content', async () => {
    const longTitle = 'L'.repeat(200)
    const longDescription = 'D'.repeat(2000)
    seed(
      makeEnvelope([
        makeTask({
          id: 'long',
          title: longTitle,
          description: longDescription,
        }),
      ]),
    )
    renderTasksPage()

    expect(await screen.findByText(longTitle)).toHaveClass('break-words')
    expect(screen.getByText(longDescription)).toHaveClass('break-words')
  })
})
